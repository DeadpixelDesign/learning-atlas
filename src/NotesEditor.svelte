<script lang="ts">
  import { onMount } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { Markdown } from '@tiptap/markdown';

  export let title: string;
  export let initialValue: string;
  export let onSave: (markdown: string) => void;
  export let onClose: () => void;

  let mountPoint: HTMLDivElement;
  let dialog: HTMLDialogElement;
  let closeButton: HTMLButtonElement;
  let importInput: HTMLInputElement;
  let editor: Editor | undefined;
  let mode: 'visual' | 'markdown' = 'visual';
  let sourceText = initialValue;
  let error = '';

  onMount(() => {
    editor = new Editor({
      element: mountPoint,
      extensions: [StarterKit, Markdown],
      content: initialValue || '',
      contentType: 'markdown',
      editorProps: { attributes: { 'aria-label': `${title} notes editor` } }
    });
    dialog.showModal();
    closeButton?.focus();
    return () => editor?.destroy();
  });

  function changeMode(next: 'visual' | 'markdown') {
    if (next === mode || !editor) return;
    if (next === 'markdown') sourceText = editor.getMarkdown();
    else editor.commands.setContent(sourceText, { contentType: 'markdown' });
    mode = next;
  }

  function save() {
    const markdown = mode === 'markdown' ? sourceText : editor?.getMarkdown() ?? '';
    if (markdown.length > 100_000) { error = 'Notes must be under 100,000 characters.'; return; }
    onSave(markdown);
  }

  async function importMarkdown(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error('Choose a Markdown file under 100 KB.');
      const text = await file.text();
      if (text.length > 100_000) throw new Error('Notes must be under 100,000 characters.');
      sourceText = text;
      editor?.commands.setContent(text, { contentType: 'markdown' });
      error = 'Markdown imported. Save notes to keep it.';
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Could not import this file.';
    } finally { input.value = ''; }
  }
</script>

<dialog bind:this={dialog} class="notes-dialog" aria-labelledby="notes-heading" onclose={onClose}>
    <div class="notes-header"><div><span class="eyebrow dark">ENTRY NOTES</span><h2 id="notes-heading">{title}</h2></div><button bind:this={closeButton} class="secondary-button" onclick={onClose} aria-label="Close notes">Close</button></div>
    <p class="notes-intro">Write visually or switch to Markdown. Your note is saved as Markdown text.</p>
    <div class="notes-controls"><div class="notes-mode" aria-label="Editing mode"><button class:chosen={mode === 'visual'} onclick={() => changeMode('visual')} aria-pressed={mode === 'visual'}>Visual</button><button class:chosen={mode === 'markdown'} onclick={() => changeMode('markdown')} aria-pressed={mode === 'markdown'}>Markdown</button></div><button class="secondary-button" onclick={() => importInput.click()}>Import .md</button><input bind:this={importInput} type="file" accept=".md,.markdown,text/markdown,text/plain" aria-label="Import Markdown note" onchange={importMarkdown} hidden /></div>
    {#if mode === 'visual'}<div class="notes-toolbar" aria-label="Formatting"><button title="Bold" aria-label="Bold" onclick={() => editor?.chain().focus().toggleBold().run()}><strong>B</strong></button><button title="Italic" aria-label="Italic" onclick={() => editor?.chain().focus().toggleItalic().run()}><em>I</em></button><button title="Heading" aria-label="Heading" onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button><button title="Bullet list" aria-label="Bullet list" onclick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button><button title="Numbered list" aria-label="Numbered list" onclick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button><button title="Quote" aria-label="Quote" onclick={() => editor?.chain().focus().toggleBlockquote().run()}>❝</button><button title="Undo" aria-label="Undo" onclick={() => editor?.chain().focus().undo().run()}>↶</button><button title="Redo" aria-label="Redo" onclick={() => editor?.chain().focus().redo().run()}>↷</button></div>{/if}
    <div class:source-hidden={mode === 'markdown'} class="notes-visual" bind:this={mountPoint}></div>
    {#if mode === 'markdown'}<label class="notes-source-label">Markdown source<textarea bind:value={sourceText} rows="14" spellcheck="false" aria-label="Markdown source"></textarea></label>{/if}
    {#if error}<p class="notice" role="status">{error}</p>{/if}
    <div class="notes-actions"><button class="primary-button" onclick={save}>Save notes</button><button class="secondary-button" onclick={onClose}>Cancel</button></div>
</dialog>
