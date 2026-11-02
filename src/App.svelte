<script lang="ts">
  import { onMount } from 'svelte';
  import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
  import { doc, getDoc, setDoc } from 'firebase/firestore';
  import { catalog, categoryOptions, type Category, type EntryType, type Item } from './catalog';
  import { allLibraryItems, emptyLibrary, entryTypeOf, validateItem, validateLibrary, type Library } from './library';
  import { auth, configured, db } from './firebase';

  type Flags = { started: boolean; training: boolean; exam: boolean; earned: boolean; badge: boolean; linkedin: boolean };
  type Progress = Record<string, Flags>;
  const STORAGE_KEY = 'learning-atlas-progress-v2';
  const LIBRARY_KEY = 'learning-atlas-library-v1';
  const ALLOWED_EMAIL = 'pmatos@deadpixel.design';
  const empty = (): Flags => ({ started: false, training: false, exam: false, earned: false, badge: false, linkedin: false });
  const fields: (keyof Flags)[] = ['started', 'training', 'exam', 'earned', 'badge', 'linkedin'];
  const categories: ('All' | Category)[] = ['All', ...categoryOptions];

  let progress: Progress = {};
  let library: Library = emptyLibrary();
  let allItems: Item[] = [];
  let view: 'dashboard' | 'manage' = 'dashboard';
  let manageQuery = '';
  let manageType: 'All' | EntryType = 'All';
  let showDeleted = false;
  let editingId: string | null = null;
  let formOpen = false;
  let formType: EntryType = 'Resource';
  let formTitle = '';
  let formProvider = '';
  let formUrl = '';
  let formCategory: Category = 'AEO / SEO / SMO';
  let formSummary = '';
  let formPriority = '';
  let formBadge = false;
  let formError = '';
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
    const syncView = () => { view = location.hash === '#/manage' ? 'manage' : 'dashboard'; };
    syncView();
    window.addEventListener('hashchange', syncView);
    const unsubscribe = onAuthStateChanged(auth, async (current) => {
      authLoading = true;
      user = current?.email?.toLowerCase() === ALLOWED_EMAIL ? current : null;
      lastWritten = '';
      if (current && !user) { await signOut(auth!); authError = 'This account is not allowed to use this dashboard.'; }
      if (user) await loadProgress(user);
      else { progress = {}; library = emptyLibrary(); }
      authLoading = false;
    });
    return () => { unsubscribe(); window.removeEventListener('hashchange', syncView); };
  });

  function goTo(next: 'dashboard' | 'manage') {
    view = next;
    location.hash = next === 'manage' ? '/manage' : '/';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  async function loadProgress(current: User) {
    const key = `${STORAGE_KEY}-${current.uid}`;
    const libraryKey = `${LIBRARY_KEY}-${current.uid}`;
    try {
      const savedLibrary = localStorage.getItem(libraryKey);
      if (savedLibrary) library = validateLibrary(JSON.parse(savedLibrary));
      const saved = localStorage.getItem(key);
      if (saved) progress = validate(JSON.parse(saved), allLibraryItems(library, true));
    } catch { storageAvailable = false; message = 'Local cache could not be loaded.'; }
    try {
      const snapshot = await getDoc(doc(db!, 'users', current.uid, 'progress', 'current'));
      if (snapshot.exists()) {
        library = validateLibrary(snapshot.data().library);
        progress = validate(snapshot.data().progress, allLibraryItems(library, true));
        localStorage.setItem(key, JSON.stringify(progress));
        localStorage.setItem(libraryKey, JSON.stringify(library));
        lastWritten = serializedState();
      } else if (Object.keys(progress).length || library.customItems.length || Object.keys(library.overrides).length || library.hiddenIds.length) {
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
      if (serializedState() !== lastWritten) {
        message = 'Cloud save is pending. Try signing out again when your connection returns, or export a backup first.';
        return;
      }
      try { localStorage.removeItem(`${STORAGE_KEY}-${user.uid}`); } catch { /* Private browsing may disable storage. */ }
      try { localStorage.removeItem(`${LIBRARY_KEY}-${user.uid}`); } catch { /* Private browsing may disable storage. */ }
    }
    await signOut(auth!);
    progress = {};
    library = emptyLibrary();
  }

  function serializedState() { return JSON.stringify({ progress, library }); }

  async function flush() {
    if (!user || !db) return;
    if (activeWrite) await activeWrite;
    const uid = user.uid;
    const serialized = serializedState();
    if (serialized === lastWritten) return;
    const snapshot = { progress, library };
    let succeeded = false;
    try {
      activeWrite = setDoc(doc(db, 'users', uid, 'progress', 'current'), { ...snapshot, updatedAt: new Date().toISOString() });
      await activeWrite;
      succeeded = true;
      lastWritten = serialized;
      if (message === 'Cloud save failed. Changes remain in this browser; export a backup.') message = '';
    } catch { message = 'Cloud save failed. Changes remain in this browser; export a backup.'; }
    finally {
      activeWrite = null;
      if (succeeded && serializedState() !== lastWritten && user?.uid === uid) saveTimer = setTimeout(flush, 500);
    }
  }

  function validate(value: unknown, items: Item[]): Progress {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid progress data.');
    const source = value as Record<string, unknown>;
    const result: Progress = {};
    for (const item of items) {
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

  function persist() {
    try {
      if (user) {
        localStorage.setItem(`${STORAGE_KEY}-${user.uid}`, JSON.stringify(progress));
        localStorage.setItem(`${LIBRARY_KEY}-${user.uid}`, JSON.stringify(library));
      }
      storageAvailable = true;
    } catch {
      storageAvailable = false;
      message = 'This browser could not save progress. Export a JSON backup before closing the page.';
    }
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 500);
  }

  function save(next: Progress) { progress = next; persist(); }
  function saveLibrary(next: Library) { library = validateLibrary(next); persist(); }

  function toggle(id: string, field: keyof Flags, checked: boolean) {
    save({ ...progress, [id]: { ...empty(), ...progress[id], [field]: checked } });
  }

  function isChecked(id: string, field: keyof Flags) { return progress[id]?.[field] === true; }
  function isComplete(item: Item) { return isChecked(item.id, item.kind === 'resource' ? 'training' : 'earned'); }
  $: allItems = allLibraryItems(library);
  $: visible = allItems.filter((item) =>
    (category === 'All' || item.category === category) &&
    (kind === 'all' || item.kind === kind) &&
    (priority === 'all' || item.priority === priority) &&
    `${item.provider} ${item.title} ${item.summary}`.toLowerCase().includes(query.trim().toLowerCase())
  );
  $: completed = allItems.filter(isComplete).length;
  $: started = allItems.filter((item) => isChecked(item.id, 'started')).length;
  $: credentialsEarned = allItems.filter((item) => item.kind === 'credential' && isChecked(item.id, 'earned')).length;
  $: percent = allItems.length ? Math.round(completed / allItems.length * 100) : 0;
  $: categoryStats = categories.slice(1).map((name) => {
    const items = allItems.filter((item) => item.category === name);
    const done = items.filter(isComplete).length;
    return { name, total: items.length, done, percent: items.length ? Math.round(done / items.length * 100) : 0 };
  });
  $: managedItems = allLibraryItems(library, showDeleted).filter((item) =>
    (manageType === 'All' || entryTypeOf(item) === manageType) &&
    `${item.title} ${item.provider} ${item.category}`.toLowerCase().includes(manageQuery.trim().toLowerCase())
  );

  function startNew(type: EntryType = 'Resource') {
    editingId = null; formType = type; formTitle = ''; formProvider = ''; formUrl = '';
    formCategory = 'AEO / SEO / SMO'; formSummary = ''; formPriority = ''; formBadge = false;
    formError = ''; formOpen = true; goTo('manage');
  }

  function startEdit(item: Item) {
    editingId = item.id; formType = entryTypeOf(item); formTitle = item.title;
    formProvider = item.provider; formUrl = item.url; formCategory = item.category;
    formSummary = item.summary; formPriority = item.priority ?? ''; formBadge = item.badge === true;
    formError = ''; formOpen = true; goTo('manage');
  }

  function saveEntry(event: SubmitEvent) {
    event.preventDefault();
    try {
      if (!editingId && library.customItems.length >= 300) throw new Error('The library has reached its 300 custom entry limit.');
      const id = editingId ?? `custom-${crypto.randomUUID()}`;
      const item = validateItem({ id, title: formTitle, provider: formProvider, url: formUrl,
        category: formCategory, summary: formSummary, priority: formPriority || undefined,
        entryType: formType, badge: formBadge });
      const next: Library = editingId && catalog.some((entry) => entry.id === editingId)
        ? { ...library, overrides: { ...library.overrides, [id]: item } }
        : { ...library, customItems: editingId
          ? library.customItems.map((entry) => entry.id === id ? item : entry)
          : [...library.customItems, item] };
      saveLibrary(next);
      formOpen = false; editingId = null; message = 'Library entry saved.';
    } catch (error) { formError = error instanceof Error ? error.message : 'Could not save this entry.'; }
  }

  function deleteEntry(item: Item) {
    if (!confirm(`Delete “${item.title}” from your library? You can restore it later.`)) return;
    saveLibrary({ ...library, hiddenIds: [...library.hiddenIds, item.id] });
    if (editingId === item.id) { formOpen = false; editingId = null; }
    message = 'Entry deleted. Turn on “Show deleted” to restore it.';
  }

  function restoreEntry(item: Item) {
    saveLibrary({ ...library, hiddenIds: library.hiddenIds.filter((id) => id !== item.id) });
    message = 'Entry restored.';
  }

  function exportBackup() {
    const payload = { format: 'learning-atlas', version: 2, exportedAt: new Date().toISOString(), progress, library };
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
      if (data?.format !== 'learning-atlas' || ![1, 2].includes(data.version)) throw new Error('This is not a supported Learning Atlas backup.');
      const importedLibrary = data.version === 2 ? validateLibrary(data.library) : library;
      const imported = validate(data.progress, allLibraryItems(importedLibrary, true));
      if (!confirm(data.version === 2 ? 'Replace current progress and library edits with this backup?' : 'Replace current progress with this older backup?')) return;
      progress = imported; library = importedLibrary; persist();
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
    <button class="side-link" class:active={view === 'dashboard'} onclick={() => goTo('dashboard')} aria-current={view === 'dashboard' ? 'page' : undefined}><span aria-hidden="true">▦</span> Dashboard</button>
    <button class="side-link" class:active={view === 'manage'} onclick={() => goTo('manage')} aria-current={view === 'manage' ? 'page' : undefined}><span aria-hidden="true">▤</span> Manage library</button>
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
    <header class="topbar"><span class="breadcrumb">Workspace <span aria-hidden="true">/</span> <strong>{view === 'dashboard' ? 'Dashboard' : 'Manage library'}</strong></span><span class="topbar-right">{user.email} <button class="signout" onclick={logOut}>Sign out</button></span></header>
    <div class="content">
      <nav class="mobile-nav" aria-label="Pages"><button class:chosen={view === 'dashboard'} onclick={() => goTo('dashboard')} aria-current={view === 'dashboard' ? 'page' : undefined}>Dashboard</button><button class:chosen={view === 'manage'} onclick={() => goTo('manage')} aria-current={view === 'manage' ? 'page' : undefined}>Manage library</button></nav>
      {#if view === 'dashboard'}
      <section class="hero" aria-labelledby="page-title">
        <div class="hero-copy"><span class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span> YOUR LEARNING SPACE</span><h1 id="page-title">Make progress<br /><em>visible.</em></h1><p>One place for your courses, certification goals, and the milestones that matter along the way.</p></div>
        <div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="planet"><span>✦</span></div><span class="spark spark-one">✦</span><span class="spark spark-two">✧</span><span class="spark spark-three">✦</span></div>
      </section>

      <section class="stats" aria-label="Progress summary">
        <div class="stat-card overall"><div class="stat-kicker">OVERALL PROGRESS</div><div class="stat-main"><strong>{percent}%</strong><span>{completed} of {allItems.length} complete</span></div><div class="track" role="progressbar" aria-label="Overall completion" aria-valuenow={completed} aria-valuemin="0" aria-valuemax={allItems.length}><span style={`width:${percent}%`}></span></div></div>
        <div class="stat-card"><div class="stat-kicker">IN MOTION</div><div class="stat-number">{started}<span class="stat-symbol">↗</span></div><div class="stat-sub">Resources and goals started</div></div>
        <div class="stat-card"><div class="stat-kicker">CREDENTIALS EARNED</div><div class="stat-number">{credentialsEarned}<span class="stat-symbol gold">✧</span></div><div class="stat-sub">Manually marked as awarded</div></div>
      </section>

      <section class="catalog-section" aria-labelledby="catalog-heading">
        <div class="section-heading"><div><span class="eyebrow dark">YOUR LIBRARY</span><h2 id="catalog-heading">Explore your paths<span class="heading-period">.</span></h2><p>Provider resources and your own entries, organized for your journey.</p></div><div class="backup-actions"><button class="secondary-button" onclick={() => goTo('manage')}>Manage library</button><button class="secondary-button" onclick={exportBackup}>↓ Export backup</button><button class="secondary-button" onclick={() => importInput.click()}>↑ Import backup</button><input bind:this={importInput} type="file" accept="application/json,.json" aria-label="Choose a JSON backup" onchange={importBackup} hidden /></div></div>
        {#if message}<p class="notice" role="status">{message}</p>{/if}
        {#if !storageAvailable}<p class="notice warning" role="alert">Local saving is unavailable in this browser. Keep a JSON backup.</p>{/if}
        <div class="toolbar"><div class="category-tabs" aria-label="Filter by category">{#each categories as option}<button class:chosen={category === option} onclick={() => category = option} aria-pressed={category === option}>{option}</button>{/each}</div><div class="toolbar-controls"><label class="search"><span aria-hidden="true">⌕</span><span class="sr-only">Search resources</span><input type="search" placeholder="Search resources..." bind:value={query} /></label><label class="type-select"><span class="sr-only">Resource type</span><select bind:value={kind}><option value="all">All types</option><option value="resource">Learning resources</option><option value="credential">Credential goals</option></select></label><label class="type-select"><span class="sr-only">Priority</span><select bind:value={priority}><option value="all">Any priority</option><option value="P1">P1 Essential</option><option value="P2">P2 Recommended</option><option value="P3">P3 Optional</option></select></label></div></div>
        <div class="results-line"><span>Showing <strong>{visible.length}</strong> of {allItems.length} paths · P1 essential, P2 recommended, P3 optional</span><span><i class="legend-dot resource"></i> Learning resource <i class="legend-dot credential"></i> Credential goal</span></div>
        <div class="cards">
          {#each visible as item (item.id)}
            <article class="course-card" class:complete={isComplete(item)}>
              <div class="card-top"><span class:credential={item.kind === 'credential'} class="kind-pill">{item.entryType?.toUpperCase() ?? item.resourceType ?? (item.kind === 'resource' ? 'LEARNING RESOURCE' : 'CREDENTIAL GOAL')}{item.priority ? ` · ${item.priority}` : ''}</span><span class="category-name">{item.category}</span></div>
              <div class="provider">{item.provider}</div><h3>{item.title}</h3><p class="summary">{item.summary}</p>
              <a class="course-link" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.title} in a new tab`}>Open resource <span aria-hidden="true">↗</span></a>
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
      {:else}
      <section class="manage-page" aria-labelledby="manage-heading">
        <div class="manage-heading"><div><span class="eyebrow dark">YOUR LIBRARY</span><h1 id="manage-heading">Manage your learning.</h1><p>Add resources, career paths, courses, and certificates. Changes sync to your account.</p></div><button class="primary-button" onclick={() => startNew()}>+ Add entry</button></div>
        {#if message}<p class="notice" role="status">{message}</p>{/if}
        {#if !storageAvailable}<p class="notice warning" role="alert">Local saving is unavailable in this browser. Export a JSON backup before closing the page.</p>{/if}
        {#if formOpen}
          <form class="entry-form" onsubmit={saveEntry}>
            <div class="form-heading"><h2>{editingId ? 'Edit entry' : 'Add entry'}</h2><button type="button" class="text-button" onclick={() => formOpen = false}>Close</button></div>
            <div class="form-grid">
              <label>Type<select bind:value={formType}><option>Resource</option><option>Career Path</option><option>Course</option><option>Certificate</option></select></label>
              <label>Category<select bind:value={formCategory}>{#each categoryOptions as option}<option value={option}>{option}</option>{/each}</select></label>
              <label>Title<input bind:value={formTitle} maxlength="160" required placeholder="e.g. AEO fundamentals" /></label>
              <label>Provider<input bind:value={formProvider} maxlength="100" required placeholder="e.g. Ahrefs Academy" /></label>
              <label class="wide">Link<input type="url" bind:value={formUrl} maxlength="500" required placeholder="https://example.com/course" /></label>
              <label class="wide">Description<textarea bind:value={formSummary} maxlength="500" rows="3" required placeholder="What will you learn or earn?"></textarea></label>
              <label>Priority<select bind:value={formPriority}><option value="">No priority</option><option value="P1">P1 Essential</option><option value="P2">P2 Recommended</option><option value="P3">P3 Optional</option></select></label>
              {#if formType === 'Certificate'}<label class="check-field"><input type="checkbox" bind:checked={formBadge} /> Issuer offers a badge</label>{/if}
            </div>
            {#if formError}<p class="notice warning" role="alert">{formError}</p>{/if}
            <div class="form-actions"><button type="submit" class="primary-button">{editingId ? 'Save changes' : 'Add to library'}</button><button type="button" class="secondary-button" onclick={() => formOpen = false}>Cancel</button></div>
          </form>
        {/if}
        <div class="manage-toolbar"><label class="manage-search">Search entries<input type="search" bind:value={manageQuery} placeholder="Search by name, provider, or category" /></label><label>Type<select bind:value={manageType}><option>All</option><option>Resource</option><option>Career Path</option><option>Course</option><option>Certificate</option></select></label><label class="check-field"><input type="checkbox" bind:checked={showDeleted} /> Show deleted</label></div>
        <p class="manage-count">{managedItems.length} entries shown · {library.customItems.length} added by you</p>
        <div class="manage-list">
          {#each managedItems as item (item.id)}
            <article class="manage-row" class:deleted={library.hiddenIds.includes(item.id)}>
              <div><div class="manage-row-meta"><span class:credential={item.kind === 'credential'} class="kind-pill">{entryTypeOf(item).toUpperCase()}</span><span>{item.category}</span><span>{catalog.some((entry) => entry.id === item.id) ? 'Included' : 'Yours'}</span>{#if library.hiddenIds.includes(item.id)}<span>Deleted</span>{/if}</div><h2>{item.title}</h2><p>{item.provider} · {item.summary}</p></div>
              <div class="manage-actions">{#if library.hiddenIds.includes(item.id)}<button class="secondary-button" onclick={() => restoreEntry(item)}>Restore</button>{:else}<button class="secondary-button" onclick={() => startEdit(item)}>Edit</button><button class="danger-button" onclick={() => deleteEntry(item)}>Delete</button>{/if}</div>
            </article>
          {:else}<div class="empty-state"><h3>No entries found</h3><p>Try a different search or add an entry.</p></div>{/each}
        </div>
        <p class="manage-help">Deleted entries can be restored using “Show deleted.” Progress flags are preserved if you restore an entry. Edit the type to decide whether it tracks training completion or a credential award.</p>
      </section>
      {/if}
      <footer><span>Learning Atlas · Progress saved to your Firebase account, with a browser cache</span><span>Catalog updated November 2026 · Verify course availability with each provider</span></footer>
    </div>
  </main>
</div>
{/if}
