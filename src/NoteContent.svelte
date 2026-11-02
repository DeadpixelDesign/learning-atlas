<script lang="ts">
  import { onMount } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { Markdown } from '@tiptap/markdown';

  export let markdown: string;

  let mountPoint: HTMLDivElement;
  let editor: Editor | undefined;
  let rendered = '';

  onMount(() => {
    editor = new Editor({
      element: mountPoint,
      extensions: [StarterKit, Markdown],
      content: markdown,
      contentType: 'markdown',
      editable: false,
      editorProps: { attributes: { 'aria-label': 'Saved note' } }
    });
    rendered = markdown;
    return () => editor?.destroy();
  });

  $: if (editor && markdown !== rendered) {
    editor.commands.setContent(markdown, { contentType: 'markdown' });
    rendered = markdown;
  }
</script>

<div class="note-content" bind:this={mountPoint}></div>
