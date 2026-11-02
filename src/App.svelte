<script lang="ts">
  import { onMount } from 'svelte';
  import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
  import { doc, getDoc, setDoc } from 'firebase/firestore';
  import { catalog, type Category, type Item } from './catalog';
  import { auth, configured, db } from './firebase';

  type Flags = { started: boolean; training: boolean; exam: boolean; earned: boolean; badge: boolean; linkedin: boolean };
  type Progress = Record<string, Flags>;
  const STORAGE_KEY = 'learning-atlas-progress-v2';
  const ALLOWED_EMAIL = 'pmatos@deadpixel.design';
  const empty = (): Flags => ({ started: false, training: false, exam: false, earned: false, badge: false, linkedin: false });
  const fields: (keyof Flags)[] = ['started', 'training', 'exam', 'earned', 'badge', 'linkedin'];
  const categories: ('All' | Category)[] = ['All', 'Cloud', 'Linux', 'Containers', 'Web', 'DevOps', 'Security', 'Data & AI', 'Marketing'];

  let progress: Progress = {};
  let category: 'All' | Category = 'All';
  let kind: 'all' | 'resource' | 'credential' = 'all';
  let priority: 'all' | 'P1' | 'P2' | 'P3' = 'all';
  let query = '';
  let message = '';
  let importInput: HTMLInputElement;
  let storageAvailable = true;
  let user: User | null = null;
  let authLoading = configured;
  let email = ALLOWED_EMAIL;
  let password = '';
  let signingIn = false;
  let authError = '';
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let activeWrite: Promise<void> | null = null;
  let lastWritten = '';

  onMount(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (current) => {
      authLoading = true;
      user = current?.email?.toLowerCase() === ALLOWED_EMAIL ? current : null;
      lastWritten = '';
      if (current && !user) { await signOut(auth!); authError = 'This account is not allowed to use this dashboard.'; }
      if (user) await loadProgress(user);
      else progress = {};
      authLoading = false;
    });
  });

  async function loadProgress(current: User) {
    const key = `${STORAGE_KEY}-${current.uid}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) progress = validate(JSON.parse(saved));
    } catch { storageAvailable = false; message = 'Local cache could not be loaded.'; }
    try {
      const snapshot = await getDoc(doc(db!, 'users', current.uid, 'progress', 'current'));
      if (snapshot.exists()) {
        progress = validate(snapshot.data().progress);
        localStorage.setItem(key, JSON.stringify(progress));
        lastWritten = JSON.stringify(progress);
      } else if (Object.keys(progress).length) {
        saveTimer = setTimeout(flush, 0);
      }
    } catch {
      message = 'Cloud progress could not be loaded. Showing the last saved browser copy, if available.';
    }
  }

  async function logIn(event: SubmitEvent) {
    event.preventDefault();
    authError = '';
    if (email.trim().toLowerCase() !== ALLOWED_EMAIL) { authError = 'This account is not allowed.'; return; }
    signingIn = true;
    try { await signInWithEmailAndPassword(auth!, email.trim(), password); password = ''; }
    catch { authError = 'Sign-in failed. Check your account details and confirm Email/Password sign-in is enabled in Firebase.'; }
    finally { signingIn = false; }
  }

  async function logOut() {
    if (saveTimer) clearTimeout(saveTimer);
    if (user) {
      await flush();
      if (JSON.stringify(progress) !== lastWritten) {
        message = 'Cloud save is pending. Try signing out again when your connection returns, or export a backup first.';
        return;
      }
      try { localStorage.removeItem(`${STORAGE_KEY}-${user.uid}`); } catch { /* Private browsing may disable storage. */ }
    }
    await signOut(auth!);
    progress = {};
  }

  async function flush() {
    if (!user || !db) return;
    if (activeWrite) await activeWrite;
    const uid = user.uid;
    const serialized = JSON.stringify(progress);
    if (serialized === lastWritten) return;
    const snapshot = progress;
    let succeeded = false;
    try {
      activeWrite = setDoc(doc(db, 'users', uid, 'progress', 'current'), { progress: snapshot, updatedAt: new Date().toISOString() });
      await activeWrite;
      succeeded = true;
      lastWritten = serialized;
      if (message === 'Cloud save failed. Progress remains in this browser; export a backup.') message = '';
    } catch { message = 'Cloud save failed. Progress remains in this browser; export a backup.'; }
    finally {
      activeWrite = null;
      if (succeeded && JSON.stringify(progress) !== lastWritten && user?.uid === uid) saveTimer = setTimeout(flush, 500);
    }
  }

  function validate(value: unknown): Progress {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid progress data.');
    const source = value as Record<string, unknown>;
    const result: Progress = {};
    for (const item of catalog) {
      const raw = source[item.id];
      if (raw === undefined) continue;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`Invalid entry: ${item.id}`);
      const record = raw as Record<string, unknown>;
      const next = empty();
      for (const field of fields) {
        if (record[field] !== undefined && typeof record[field] !== 'boolean') throw new Error(`Invalid flag: ${item.id}.${field}`);
        next[field] = record[field] === true;
      }
      result[item.id] = next;
    }
    return result;
  }

  function save(next: Progress) {
    progress = next;
    try {
      if (user) localStorage.setItem(`${STORAGE_KEY}-${user.uid}`, JSON.stringify(next));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
      message = 'This browser could not save progress. Export a JSON backup before closing the page.';
    }
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 500);
  }

  function toggle(id: string, field: keyof Flags, checked: boolean) {
    save({ ...progress, [id]: { ...empty(), ...progress[id], [field]: checked } });
  }

  function isChecked(id: string, field: keyof Flags) { return progress[id]?.[field] === true; }
  function isComplete(item: Item) { return isChecked(item.id, item.kind === 'resource' ? 'training' : 'earned'); }
  $: visible = catalog.filter((item) =>
    (category === 'All' || item.category === category) &&
    (kind === 'all' || item.kind === kind) &&
    (priority === 'all' || item.priority === priority) &&
    `${item.provider} ${item.title} ${item.summary}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  $: completed = catalog.filter(isComplete).length;
  $: started = catalog.filter((item) => isChecked(item.id, 'started')).length;
  $: credentialsEarned = catalog.filter((item) => item.kind === 'credential' && isChecked(item.id, 'earned')).length;
  $: percent = Math.round(completed / catalog.length * 100);
  $: categoryStats = categories.slice(1).map((name) => {
    const items = catalog.filter((item) => item.category === name);
    const done = items.filter(isComplete).length;
    return { name, total: items.length, done, percent: Math.round(done / items.length * 100) };
  });

  function exportBackup() {
    const payload = { format: 'learning-atlas', version: 1, exportedAt: new Date().toISOString(), progress };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `learning-atlas-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    message = 'Backup downloaded.';
  }

  async function importBackup(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error('File is too large.');
      const data = JSON.parse(await file.text());
      if (data?.format !== 'learning-atlas' || data?.version !== 1) throw new Error('This is not a Learning Atlas version 1 backup.');
      const imported = validate(data.progress);
      if (!confirm('Replace all current progress with this backup?')) return;
      save(imported);
      message = 'Backup imported.';
    } catch (error) {
      message = error instanceof Error ? `Import failed: ${error.message}` : 'Import failed.';
    } finally {
      input.value = '';
    }
  }
</script>

<svelte:head>
  <title>Learning Atlas — Course & credential tracker</title>
</svelte:head>

{#if !configured}
  <main class="auth-page"><div class="auth-card"><div class="brand"><span class="brand-mark" aria-hidden="true">✦</span><span>learning<span class="brand-light">atlas</span></span></div><h1>Firebase setup needed</h1><p>Add your Firebase web app settings as described in the README, then rebuild the site. The dashboard does not ship with a password in its source code.</p></div></main>
{:else if authLoading}
  <main class="auth-page"><div class="auth-card"><div class="brand"><span class="brand-mark" aria-hidden="true">✦</span><span>learning<span class="brand-light">atlas</span></span></div><p role="status">Loading your progress…</p></div></main>
{:else if !user}
  <main class="auth-page"><div class="auth-card"><div class="brand"><span class="brand-mark" aria-hidden="true">✦</span><span>learning<span class="brand-light">atlas</span></span></div><span class="eyebrow">YOUR LEARNING SPACE</span><h1>Welcome back.</h1><p>Sign in to see and update your course progress.</p><form onsubmit={logIn}><label for="email">Email</label><input id="email" type="email" bind:value={email} required autocomplete="username" /><label for="password">Password</label><input id="password" type="password" bind:value={password} required autocomplete="current-password" /><button type="submit" disabled={signingIn}>{signingIn ? 'Signing in…' : 'Sign in'}</button></form>{#if authError}<p class="auth-error" role="alert">{authError}</p>{/if}</div></main>
{:else}
<div class="app-shell">
  <aside class="sidebar" aria-label="Dashboard overview">
    <div class="brand"><span class="brand-mark" aria-hidden="true">✦</span><span>learning<span class="brand-light">atlas</span></span></div>
    <div class="side-section-label">YOUR JOURNEY</div>
    <div class="side-link active"><span aria-hidden="true">▦</span> Dashboard</div>
    <div class="side-note">A calm place to keep your learning moving.</div>
    <div class="side-divider"></div>
    <div class="side-section-label">PROGRESS BY AREA</div>
    {#each categoryStats as stat}
      <div class="side-progress">
        <div class="side-progress-heading"><span>{stat.name}</span><span>{stat.done}/{stat.total}</span></div>
        <div class="mini-track" role="progressbar" aria-label={`${stat.name} completion`} aria-valuenow={stat.done} aria-valuemin="0" aria-valuemax={stat.total}><span style={`width:${stat.percent}%`}></span></div>
      </div>
    {/each}
    <div class="side-bottom"><span class="privacy-icon" aria-hidden="true">◈</span><strong>Your progress, your account</strong><p>Synced with Firebase and cached in this browser. Export a backup anytime.</p></div>
  </aside>

  <main id="main-content">
    <header class="topbar"><span class="breadcrumb">Workspace <span aria-hidden="true">/</span> <strong>Dashboard</strong></span><span class="topbar-right">{user.email} <button class="signout" onclick={logOut}>Sign out</button></span></header>
    <div class="content">
      <section class="hero" aria-labelledby="page-title">
        <div class="hero-copy"><span class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span> YOUR LEARNING SPACE</span><h1 id="page-title">Make progress<br /><em>visible.</em></h1><p>One place for your courses, certification goals, and the milestones that matter along the way.</p></div>
        <div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="planet"><span>✦</span></div><span class="spark spark-one">✦</span><span class="spark spark-two">✧</span><span class="spark spark-three">✦</span></div>
      </section>

      <section class="stats" aria-label="Progress summary">
        <div class="stat-card overall"><div class="stat-kicker">OVERALL PROGRESS</div><div class="stat-main"><strong>{percent}%</strong><span>{completed} of {catalog.length} complete</span></div><div class="track" role="progressbar" aria-label="Overall completion" aria-valuenow={completed} aria-valuemin="0" aria-valuemax={catalog.length}><span style={`width:${percent}%`}></span></div></div>
        <div class="stat-card"><div class="stat-kicker">IN MOTION</div><div class="stat-number">{started}<span class="stat-symbol">↗</span></div><div class="stat-sub">Resources and goals started</div></div>
        <div class="stat-card"><div class="stat-kicker">CREDENTIALS EARNED</div><div class="stat-number">{credentialsEarned}<span class="stat-symbol gold">✧</span></div><div class="stat-sub">Manually marked as awarded</div></div>
      </section>

      <section class="catalog-section" aria-labelledby="catalog-heading">
        <div class="section-heading"><div><span class="eyebrow dark">YOUR LIBRARY</span><h2 id="catalog-heading">Explore your paths<span class="heading-period">.</span></h2><p>Official provider resources and credential goals, organized for your journey.</p></div><div class="backup-actions"><button class="secondary-button" onclick={exportBackup}>↓ Export backup</button><button class="secondary-button" onclick={() => importInput.click()}>↑ Import backup</button><input bind:this={importInput} type="file" accept="application/json,.json" aria-label="Choose a JSON backup" onchange={importBackup} hidden /></div></div>
        {#if message}<p class="notice" role="status">{message}</p>{/if}
        {#if !storageAvailable}<p class="notice warning" role="alert">Local saving is unavailable in this browser. Keep a JSON backup.</p>{/if}
        <div class="toolbar"><div class="category-tabs" aria-label="Filter by category">{#each categories as option}<button class:chosen={category === option} onclick={() => category = option} aria-pressed={category === option}>{option}</button>{/each}</div><div class="toolbar-controls"><label class="search"><span aria-hidden="true">⌕</span><span class="sr-only">Search resources</span><input type="search" placeholder="Search resources..." bind:value={query} /></label><label class="type-select"><span class="sr-only">Resource type</span><select bind:value={kind}><option value="all">All types</option><option value="resource">Learning resources</option><option value="credential">Credential goals</option></select></label><label class="type-select"><span class="sr-only">Priority</span><select bind:value={priority}><option value="all">Any priority</option><option value="P1">P1 Essential</option><option value="P2">P2 Recommended</option><option value="P3">P3 Optional</option></select></label></div></div>
        <div class="results-line"><span>Showing <strong>{visible.length}</strong> of {catalog.length} paths · P1 essential, P2 recommended, P3 optional</span><span><i class="legend-dot resource"></i> Learning resource <i class="legend-dot credential"></i> Credential goal</span></div>
        <div class="cards">
          {#each visible as item (item.id)}
            <article class="course-card" class:complete={isComplete(item)}>
              <div class="card-top"><span class:credential={item.kind === 'credential'} class="kind-pill">{item.resourceType ?? (item.kind === 'resource' ? 'LEARNING RESOURCE' : 'CREDENTIAL GOAL')}{item.priority ? ` · ${item.priority}` : ''}</span><span class="category-name">{item.category}</span></div>
              <div class="provider">{item.provider}</div><h3>{item.title}</h3><p class="summary">{item.summary}</p>
              <a class="course-link" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.title} on the official provider site (new tab)`}>Open official page <span aria-hidden="true">↗</span></a>
              <div class="card-divider"></div>
              <div class="flags" aria-label={`${item.title} milestones`}>
                <label><input type="checkbox" checked={isChecked(item.id, 'started')} onchange={(e) => toggle(item.id, 'started', e.currentTarget.checked)} /><span>Started</span></label>
                <label><input type="checkbox" checked={isChecked(item.id, 'training')} onchange={(e) => toggle(item.id, 'training', e.currentTarget.checked)} /><span>Training complete</span></label>
                {#if item.kind === 'credential'}
                  <label><input type="checkbox" checked={isChecked(item.id, 'exam')} onchange={(e) => toggle(item.id, 'exam', e.currentTarget.checked)} /><span>Exam / assessment passed</span></label>
                  <label><input type="checkbox" checked={isChecked(item.id, 'earned')} onchange={(e) => toggle(item.id, 'earned', e.currentTarget.checked)} /><span>Credential awarded</span></label>
                {/if}
                {#if item.badge}<label><input type="checkbox" checked={isChecked(item.id, 'badge')} onchange={(e) => toggle(item.id, 'badge', e.currentTarget.checked)} /><span>Badge claimed</span></label>{/if}
                {#if item.kind === 'credential'}
                  <label><input type="checkbox" checked={isChecked(item.id, 'linkedin')} onchange={(e) => toggle(item.id, 'linkedin', e.currentTarget.checked)} /><span>Added to LinkedIn</span></label>
                {/if}
              </div>
              {#if isComplete(item)}<div class="complete-label">✓ {item.kind === 'resource' ? 'Training complete' : 'Marked as awarded'}</div>{/if}
            </article>
          {:else}
            <div class="empty-state"><span aria-hidden="true">⌕</span><h3>No matching paths</h3><p>Try another search or filter.</p><button onclick={() => { query = ''; category = 'All'; kind = 'all'; priority = 'all'; }}>Clear filters</button></div>
          {/each}
        </div>
      </section>
      <footer><span>Learning Atlas · Progress saved to your Firebase account, with a browser cache</span><span>Catalog updated November 2026 · Verify course availability with each provider</span></footer>
    </div>
  </main>
</div>
{/if}
