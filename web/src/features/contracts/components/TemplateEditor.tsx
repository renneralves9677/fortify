import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Node, mergeAttributes } from '@tiptap/core';
import { useEffect } from 'react';
import { Button } from '@shared/components/ui/Button';
import { Select } from '@shared/components/ui/Input';
import type { TemplateField } from '@features/contracts/api/templates';

const VariableNode = Node.create({
  name: 'templateVariable',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return { key: { default: '' } };
  },
  parseHTML() {
    return [{ tag: 'span[data-template-variable]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const key = HTMLAttributes.key as string;
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-template-variable': key,
        class: 'template-variable inline-flex rounded bg-brand/10 px-1.5 py-0.5 font-mono text-xs text-brand',
      }),
      `{{${key}}}`,
    ];
  },
});

const SignatureFieldNode = Node.create({
  name: 'signatureField',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      key: { default: '' },
      label: { default: '' },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-signature-key]' }];
  },
  renderHTML({ HTMLAttributes }) {
    const key = HTMLAttributes.key as string;
    const label = (HTMLAttributes.label as string) || key;
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-signature-key': key,
        class: 'signature-block signature-block--pending',
      }),
      ['hr', { class: 'signature-block__divider' }],
      ['p', { class: 'signature-block__title' }, `ASSINATURA DO ${label}`],
      ['p', { class: 'signature-block__status' }, 'Pendente'],
    ];
  },
});

interface TemplateEditorProps {
  value: string;
  onChange: (html: string) => void;
  fields: TemplateField[];
  disabled?: boolean;
}

function ToolbarButton({
  onClick,
  active,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs ${active ? 'bg-brand text-on-brand' : 'bg-surface text-ink hover:bg-surface-hover'}`}
    >
      {children}
    </button>
  );
}

export function TemplateEditor({ value, onChange, fields, disabled }: TemplateEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false, code: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      VariableNode,
      SignatureFieldNode,
    ],
    content: value || '<p></p>',
    editable: !disabled,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && value !== undefined) {
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  const textFields = fields.filter((f) => f.fieldType !== 'signature');
  const signatureFields = fields.filter((f) => f.fieldType === 'signature');

  if (!editor) return null;

  return (
    <div className="space-y-2">
      {!disabled && (
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
          >
            B
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
          >
            I
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
          >
            U
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
          >
            Esq
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
          >
            Centro
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          >
            Tabela
          </ToolbarButton>
          {textFields.length > 0 && (
            <Select
              label=""
              className="min-w-[10rem]"
              defaultValue=""
              onChange={(e) => {
                const key = e.target.value;
                if (!key) return;
                editor.chain().focus().insertContent({ type: 'templateVariable', attrs: { key } }).run();
                e.target.value = '';
              }}
            >
              <option value="">+ Variável</option>
              {textFields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label} ({f.key})
                </option>
              ))}
            </Select>
          )}
          {signatureFields.map((f) => (
            <Button
              key={f.key}
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: 'signatureField',
                    attrs: { key: f.key, label: f.label },
                  })
                  .run()
              }
            >
              + {f.label}
            </Button>
          ))}
        </div>
      )}
      <EditorContent
        editor={editor}
        className="min-h-[280px] rounded-lg border border-border bg-card p-4 prose prose-sm max-w-none dark:prose-invert [&_.ProseMirror]:min-h-[240px] [&_.ProseMirror]:outline-none"
      />
    </div>
  );
}
