import { useMemo, useState } from 'react'
import { TASK_PRIORITIES } from '@shared/app.constants'
import type { KanbanColumnDto, TagDto, TagInput, TaskDto, TaskInput, TaskNoteInput } from '@shared/task.types'
import { fromDateTimeInputValue, toDateTimeInputValue } from '../utils/date'
import { CloseIcon } from './Icons'

type TaskFormModalProps = {
  task: TaskDto | null
  columns: KanbanColumnDto[]
  tags: TagDto[]
  onClose: () => void
  onSubmit: (input: TaskInput) => Promise<void>
}

const defaultTagColor = '#dff2e9'

const emptyTaskInput = (columnId: string): TaskInput => ({
  title: '',
  description: '',
  priority: 'MEDIUM',
  dueDate: null,
  assigner: '',
  assignee: '',
  reminderHours: 0,
  reminderMinutes: 30,
  columnId,
  checklistItems: [],
  tags: [],
  notes: []
})

const fromTask = (task: TaskDto): TaskInput => ({
  title: task.title,
  description: task.description,
  priority: task.priority,
  dueDate: task.dueDate,
  assigner: task.assigner,
  assignee: task.assignee,
  reminderHours: task.reminderHours,
  reminderMinutes: task.reminderMinutes,
  columnId: task.columnId,
  checklistItems: task.checklistItems,
  tags: task.tags.map((tag) => ({
    name: tag.name,
    color: tag.color
  })),
  notes: task.notes
})

export const TaskFormModal = ({ task, columns, tags, onClose, onSubmit }: TaskFormModalProps) => {
  const initialInput = useMemo(() => (task ? fromTask(task) : emptyTaskInput(columns[0]?.id ?? 'backlog')), [columns, task])
  const [form, setForm] = useState<TaskInput>(initialInput)
  const [dueDateValue, setDueDateValue] = useState(toDateTimeInputValue(initialInput.dueDate))
  const [checklistDraft, setChecklistDraft] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const [tagDraftColor, setTagDraftColor] = useState(defaultTagColor)
  const [noteDraft, setNoteDraft] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const addChecklistItem = (): void => {
    const title = checklistDraft.trim()
    if (!title) {
      return
    }

    setForm((current) => ({
      ...current,
      checklistItems: [
        ...current.checklistItems,
        {
          title,
          completed: false,
          order: current.checklistItems.length
        }
      ]
    }))
    setChecklistDraft('')
  }

  const addTag = (value = tagDraft): void => {
    const name = value.trim()
    if (!name || form.tags.some((tag) => tag.name === name)) {
      return
    }

    const existingTag = tags.find((tag) => tag.name === name)
    const nextTag: TagInput = {
      name,
      color: existingTag?.color ?? tagDraftColor
    }

    setForm((current) => ({
      ...current,
      tags: [...current.tags, nextTag]
    }))
    setTagDraft('')
    setTagDraftColor(defaultTagColor)
  }

  const updateTagColor = (name: string, color: string): void => {
    setForm((current) => ({
      ...current,
      tags: current.tags.map((tag) => (tag.name === name ? { ...tag, color } : tag))
    }))
  }

  const addNote = (): void => {
    const body = noteDraft.trim()
    if (!body) {
      return
    }

    const note: TaskNoteInput = {
      body,
      createdAt: new Date().toISOString()
    }

    setForm((current) => ({
      ...current,
      notes: [...current.notes, note]
    }))
    setNoteDraft('')
  }

  const submit = async (): Promise<void> => {
    setIsSaving(true)
    try {
      await onSubmit({
        ...form,
        dueDate: fromDateTimeInputValue(dueDateValue)
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="task-modal"
        onSubmit={(event) => {
          event.preventDefault()
          submit().catch(console.error)
        }}
      >
        <header className="modal-header">
          <div>
            <h2>{task ? 'Редактирование задачи' : 'Новая задача'}</h2>
            <p>Заполните основные поля, чек-лист, теги и личные заметки.</p>
          </div>
          <button className="icon-button close-button" type="button" aria-label="Закрыть форму" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="form-grid">
          <label className="field field-wide">
            <span>Название задачи</span>
            <input
              autoFocus
              required
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </label>

          <label className="field field-wide">
            <span>Описание задачи</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Постановщик</span>
            <input
              value={form.assigner}
              onChange={(event) => setForm((current) => ({ ...current, assigner: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Исполнитель</span>
            <input
              value={form.assignee}
              onChange={(event) => setForm((current) => ({ ...current, assignee: event.target.value }))}
            />
          </label>

          <label className="field">
            <span>Крайний срок</span>
            <input type="datetime-local" value={dueDateValue} onChange={(event) => setDueDateValue(event.target.value)} />
          </label>

          <label className="field">
            <span>Приоритет</span>
            <select
              value={form.priority}
              onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as TaskInput['priority'] }))}
            >
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority.id} value={priority.id}>
                  {priority.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Колонка</span>
            <select value={form.columnId} onChange={(event) => setForm((current) => ({ ...current, columnId: event.target.value }))}>
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.title}
                </option>
              ))}
            </select>
          </label>

          <div className="field reminder-field">
            <span>Уведомить до срока</span>
            <div className="inline-inputs">
              <label>
                <input
                  min={0}
                  type="number"
                  value={form.reminderHours}
                  onChange={(event) => setForm((current) => ({ ...current, reminderHours: Number(event.target.value) }))}
                />
                <span>ч</span>
              </label>
              <label>
                <input
                  min={0}
                  max={59}
                  type="number"
                  value={form.reminderMinutes}
                  onChange={(event) => setForm((current) => ({ ...current, reminderMinutes: Number(event.target.value) }))}
                />
                <span>мин</span>
              </label>
            </div>
          </div>
        </div>

        <section className="form-section">
          <h3>Чек-лист</h3>
          <div className="add-row">
            <input value={checklistDraft} placeholder="Добавить пункт" onChange={(event) => setChecklistDraft(event.target.value)} />
            <button className="button button-secondary" type="button" onClick={addChecklistItem}>
              Добавить
            </button>
          </div>
          <div className="checklist-list">
            {form.checklistItems.map((item, index) => (
              <label className="checklist-item" key={`${item.id ?? 'new'}-${index}`}>
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      checklistItems: current.checklistItems.map((candidate, candidateIndex) =>
                        candidateIndex === index ? { ...candidate, completed: event.target.checked } : candidate
                      )
                    }))
                  }
                />
                <span>{item.title}</span>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      checklistItems: current.checklistItems.filter((_candidate, candidateIndex) => candidateIndex !== index)
                    }))
                  }
                >
                  Удалить
                </button>
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h3>Теги</h3>
          <div className="add-tag-row">
            <input list="task-tags" value={tagDraft} placeholder="Новый тег" onChange={(event) => setTagDraft(event.target.value)} />
            <input
              className="color-input"
              type="color"
              aria-label="Цвет нового тега"
              value={tagDraftColor}
              onChange={(event) => setTagDraftColor(event.target.value)}
            />
            <datalist id="task-tags">
              {tags.map((tag) => (
                <option key={tag.id} value={tag.name} />
              ))}
            </datalist>
            <button className="button button-secondary" type="button" onClick={() => addTag()}>
              Добавить
            </button>
          </div>
          <div className="tag-editor-list">
            {form.tags.map((tag) => (
              <div className="tag-editor-row" key={tag.name}>
                <span className="tag-pill" style={{ backgroundColor: tag.color, borderColor: tag.color }}>
                  {tag.name}
                </span>
                <input
                  className="color-input"
                  type="color"
                  aria-label={`Цвет тега ${tag.name}`}
                  value={tag.color}
                  onChange={(event) => updateTagColor(tag.name, event.target.value)}
                />
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, tags: current.tags.filter((candidate) => candidate.name !== tag.name) }))}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h3>Заметки</h3>
          <div className="note-thread">
            {form.notes.map((note, index) => (
              <div className="note-message" key={`${note.id ?? 'new'}-${index}`}>
                <span>{note.createdAt ? new Date(note.createdAt).toLocaleString('ru-RU') : 'Сейчас'}</span>
                <p>{note.body}</p>
              </div>
            ))}
          </div>
          <div className="add-row">
            <input value={noteDraft} placeholder="Написать заметку" onChange={(event) => setNoteDraft(event.target.value)} />
            <button className="button button-secondary" type="button" onClick={addNote}>
              Добавить
            </button>
          </div>
        </section>

        <footer className="modal-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="button button-primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </footer>
      </form>
    </div>
  )
}
