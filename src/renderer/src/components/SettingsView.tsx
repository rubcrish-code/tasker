import { useState, type ReactNode } from 'react'
import type {
  AppSettings,
  CalendarDefaultMode,
  DataActionResult,
  FirstDayOfWeek,
  InterfaceDensity,
  KanbanAccentStyle,
  SettingsInfo,
  TaskDefaultSort,
  ThemePreference,
  TimeGridStepMinutes
} from '@shared/settings.types'
import { CheckLogoIcon } from './Icons'

type SettingsViewProps = {
  settings: AppSettings
  info: SettingsInfo | null
  onSettingsChange: (settings: Partial<AppSettings>) => Promise<void>
  onExportData: () => Promise<DataActionResult>
  onImportData: () => Promise<DataActionResult>
  onBackupData: () => Promise<DataActionResult>
  onOpenDataFolder: () => Promise<DataActionResult>
  onRefreshInfo: () => Promise<void>
}

type SettingsSectionId = 'appearance' | 'notifications' | 'calendar' | 'tasks' | 'kanban' | 'data' | 'about'

const sections: Array<{ id: SettingsSectionId; title: string; description: string }> = [
  { id: 'appearance', title: 'Внешний вид', description: 'Тема, плотность и анимации' },
  { id: 'notifications', title: 'Уведомления', description: 'Напоминания, трей и интервал проверки' },
  { id: 'calendar', title: 'Календарь', description: 'Режимы, рабочие часы и сетка времени' },
  { id: 'tasks', title: 'Список задач', description: 'Таблица, сортировка и подсветка' },
  { id: 'kanban', title: 'Канбан', description: 'Колонки, карточки и акценты' },
  { id: 'data', title: 'Данные', description: 'Экспорт, импорт и резервные копии' },
  { id: 'about', title: 'О приложении', description: 'Версия, пути и проект' }
]

const hourOptions = Array.from({ length: 24 }, (_item, index) => index)

const Toggle = ({
  checked,
  label,
  description,
  onChange
}: {
  checked: boolean
  label: string
  description?: string
  onChange: (checked: boolean) => void
}) => (
  <label className="setting-toggle">
    <span>
      <strong>{label}</strong>
      {description && <small>{description}</small>}
    </span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
  </label>
)

const Segmented = <T extends string | number>({
  value,
  options,
  onChange
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) => (
  <div className="settings-segmented">
    {options.map((option) => (
      <button
        className={value === option.value ? 'settings-segment settings-segment-active' : 'settings-segment'}
        key={String(option.value)}
        type="button"
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
)

const SettingsBlock = ({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: ReactNode
}) => (
  <section className="settings-block">
    <div className="settings-block-header">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
    </div>
    <div className="settings-control-list">{children}</div>
  </section>
)

const PathValue = ({ label, value }: { label: string; value: string }) => (
  <div className="settings-path-row">
    <span>{label}</span>
    <code>{value}</code>
  </div>
)

export const SettingsView = ({
  settings,
  info,
  onSettingsChange,
  onExportData,
  onImportData,
  onBackupData,
  onOpenDataFolder,
  onRefreshInfo
}: SettingsViewProps) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('appearance')
  const [dataMessage, setDataMessage] = useState<DataActionResult | null>(null)
  const activeSectionMeta = sections.find((section) => section.id === activeSection) ?? sections[0]

  const runDataAction = async (action: () => Promise<DataActionResult>): Promise<void> => {
    const result = await action()
    setDataMessage(result)
    await onRefreshInfo()
  }

  const renderAppearance = () => (
    <>
      <SettingsBlock title="Тема" description="Системная тема следует настройке операционной системы.">
        <Segmented<ThemePreference>
          value={settings.appearance.theme}
          options={[
            { value: 'light', label: 'Светлая' },
            { value: 'dark', label: 'Тёмная' },
            { value: 'system', label: 'Системная' }
          ]}
          onChange={(theme) => onSettingsChange({ appearance: { ...settings.appearance, theme } }).catch(console.error)}
        />
      </SettingsBlock>

      <SettingsBlock title="Плотность интерфейса">
        <Segmented<InterfaceDensity>
          value={settings.appearance.density}
          options={[
            { value: 'compact', label: 'Компактная' },
            { value: 'comfortable', label: 'Обычная' }
          ]}
          onChange={(density) => onSettingsChange({ appearance: { ...settings.appearance, density } }).catch(console.error)}
        />
      </SettingsBlock>

      <SettingsBlock title="Анимации">
        <Toggle
          checked={settings.appearance.reducedMotion}
          label="Уменьшенные анимации"
          description="Сокращает длительность переходов, hover-состояний и drag-and-drop."
          onChange={(reducedMotion) => onSettingsChange({ appearance: { ...settings.appearance, reducedMotion } }).catch(console.error)}
        />
      </SettingsBlock>
    </>
  )

  const renderNotifications = () => (
    <>
      <SettingsBlock title="Основные уведомления">
        <Toggle
          checked={settings.notifications.enabled}
          label="Включить уведомления"
          description="Tasker будет отправлять локальные системные уведомления."
          onChange={(enabled) => onSettingsChange({ notifications: { ...settings.notifications, enabled } }).catch(console.error)}
        />
        <Toggle
          checked={settings.notifications.dueSoon}
          label="Уведомления о приближении срока"
          onChange={(dueSoon) => onSettingsChange({ notifications: { ...settings.notifications, dueSoon } }).catch(console.error)}
        />
        <Toggle
          checked={settings.notifications.overdue}
          label="Уведомления о просрочке"
          onChange={(overdue) => onSettingsChange({ notifications: { ...settings.notifications, overdue } }).catch(console.error)}
        />
      </SettingsBlock>

      <SettingsBlock title="Закрытие окна" description="Эти настройки влияют на поведение кнопки закрытия окна.">
        <Segmented<'tray' | 'quit'>
          value={settings.notifications.closeBehavior}
          options={[
            { value: 'tray', label: 'Скрывать в трей' },
            { value: 'quit', label: 'Выходить полностью' }
          ]}
          onChange={(closeBehavior) =>
            onSettingsChange({ notifications: { ...settings.notifications, closeBehavior } }).catch(console.error)
          }
        />
      </SettingsBlock>

      <SettingsBlock title="Интервал проверки">
        <label className="setting-field">
          <span>Проверять уведомления каждые</span>
          <select
            value={settings.notifications.checkIntervalSeconds}
            onChange={(event) =>
              onSettingsChange({
                notifications: {
                  ...settings.notifications,
                  checkIntervalSeconds: Number(event.target.value)
                }
              }).catch(console.error)
            }
          >
            <option value={10}>10 секунд</option>
            <option value={30}>30 секунд</option>
            <option value={60}>1 минута</option>
            <option value={300}>5 минут</option>
            <option value={900}>15 минут</option>
          </select>
        </label>
      </SettingsBlock>
    </>
  )

  const renderCalendar = () => (
    <>
      <SettingsBlock title="Режим по умолчанию">
        <Segmented<CalendarDefaultMode>
          value={settings.calendar.defaultMode}
          options={[
            { value: 'month', label: 'Месяц' },
            { value: 'week', label: 'Неделя' }
          ]}
          onChange={(defaultMode) => onSettingsChange({ calendar: { ...settings.calendar, defaultMode } }).catch(console.error)}
        />
      </SettingsBlock>

      <SettingsBlock title="Неделя и рабочее время">
        <Segmented<FirstDayOfWeek>
          value={settings.calendar.firstDayOfWeek}
          options={[
            { value: 'monday', label: 'Понедельник' },
            { value: 'sunday', label: 'Воскресенье' }
          ]}
          onChange={(firstDayOfWeek) =>
            onSettingsChange({ calendar: { ...settings.calendar, firstDayOfWeek } }).catch(console.error)
          }
        />
        <div className="settings-inline-fields">
          <label className="setting-field">
            <span>Начало рабочего дня</span>
            <select
              value={settings.calendar.workdayStartHour}
              onChange={(event) =>
                onSettingsChange({
                  calendar: { ...settings.calendar, workdayStartHour: Number(event.target.value) }
                }).catch(console.error)
              }
            >
              {hourOptions.slice(0, 23).map((hour) => (
                <option key={hour} value={hour}>
                  {String(hour).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>
          <label className="setting-field">
            <span>Конец рабочего дня</span>
            <select
              value={settings.calendar.workdayEndHour}
              onChange={(event) =>
                onSettingsChange({
                  calendar: { ...settings.calendar, workdayEndHour: Number(event.target.value) }
                }).catch(console.error)
              }
            >
              {hourOptions.slice(1).map((hour) => (
                <option key={hour} value={hour}>
                  {String(hour).padStart(2, '0')}:00
                </option>
              ))}
              <option value={24}>24:00</option>
            </select>
          </label>
        </div>
      </SettingsBlock>

      <SettingsBlock title="Шаг временной сетки">
        <Segmented<TimeGridStepMinutes>
          value={settings.calendar.timeGridStepMinutes}
          options={[
            { value: 30, label: '30 минут' },
            { value: 60, label: '60 минут' }
          ]}
          onChange={(timeGridStepMinutes) =>
            onSettingsChange({ calendar: { ...settings.calendar, timeGridStepMinutes } }).catch(console.error)
          }
        />
      </SettingsBlock>
    </>
  )

  const renderTasks = () => (
    <>
      <SettingsBlock title="Плотность таблицы">
        <Segmented<InterfaceDensity>
          value={settings.tasks.tableDensity}
          options={[
            { value: 'compact', label: 'Компактная' },
            { value: 'comfortable', label: 'Обычная' }
          ]}
          onChange={(tableDensity) => onSettingsChange({ tasks: { ...settings.tasks, tableDensity } }).catch(console.error)}
        />
      </SettingsBlock>

      <SettingsBlock title="Поведение списка">
        <Toggle
          checked={settings.tasks.pinnedFirst}
          label="Показывать закреплённые задачи сверху"
          onChange={(pinnedFirst) => onSettingsChange({ tasks: { ...settings.tasks, pinnedFirst } }).catch(console.error)}
        />
        <Toggle
          checked={settings.tasks.highlightOverdue}
          label="Подсвечивать просроченные задачи"
          onChange={(highlightOverdue) => onSettingsChange({ tasks: { ...settings.tasks, highlightOverdue } }).catch(console.error)}
        />
      </SettingsBlock>

      <SettingsBlock title="Сортировка по умолчанию">
        <Segmented<TaskDefaultSort>
          value={settings.tasks.defaultSort}
          options={[
            { value: 'manual', label: 'По порядку' },
            { value: 'due-asc', label: 'Срок ↑' },
            { value: 'due-desc', label: 'Срок ↓' }
          ]}
          onChange={(defaultSort) => onSettingsChange({ tasks: { ...settings.tasks, defaultSort } }).catch(console.error)}
        />
      </SettingsBlock>
    </>
  )

  const renderKanban = () => (
    <>
      <SettingsBlock title="Колонки">
        <Toggle
          checked={settings.kanban.showEmptyColumns}
          label="Показывать пустые колонки"
          onChange={(showEmptyColumns) => onSettingsChange({ kanban: { ...settings.kanban, showEmptyColumns } }).catch(console.error)}
        />
      </SettingsBlock>

      <SettingsBlock title="Карточки и анимации">
        <Segmented<InterfaceDensity>
          value={settings.kanban.cardDensity}
          options={[
            { value: 'compact', label: 'Компактная' },
            { value: 'comfortable', label: 'Обычная' }
          ]}
          onChange={(cardDensity) => onSettingsChange({ kanban: { ...settings.kanban, cardDensity } }).catch(console.error)}
        />
        <Toggle
          checked={settings.kanban.reduceDragAnimations}
          label="Уменьшенные анимации drag-and-drop"
          onChange={(reduceDragAnimations) =>
            onSettingsChange({ kanban: { ...settings.kanban, reduceDragAnimations } }).catch(console.error)
          }
        />
      </SettingsBlock>

      <SettingsBlock title="Цветовые акценты колонок">
        <Segmented<KanbanAccentStyle>
          value={settings.kanban.columnAccentStyle}
          options={[
            { value: 'soft', label: 'Мягкий фон' },
            { value: 'stripe', label: 'Полоса' },
            { value: 'header', label: 'Шапка' }
          ]}
          onChange={(columnAccentStyle) =>
            onSettingsChange({ kanban: { ...settings.kanban, columnAccentStyle } }).catch(console.error)
          }
        />
      </SettingsBlock>
    </>
  )

  const renderData = () => (
    <>
      <SettingsBlock title="Управление данными" description="Экспорт и импорт работают через JSON-файл Tasker.">
        <div className="settings-action-grid">
          <button className="button button-primary" type="button" onClick={() => runDataAction(onExportData).catch(console.error)}>
            Экспортировать данные
          </button>
          <button className="button button-secondary" type="button" onClick={() => runDataAction(onImportData).catch(console.error)}>
            Импортировать данные
          </button>
          <button className="button button-secondary" type="button" onClick={() => runDataAction(onBackupData).catch(console.error)}>
            Создать резервную копию
          </button>
          <button className="button button-secondary" type="button" onClick={() => runDataAction(onOpenDataFolder).catch(console.error)}>
            Открыть папку данных
          </button>
        </div>
        {dataMessage && (
          <div className={dataMessage.ok ? 'settings-result settings-result-ok' : 'settings-result'}>
            <strong>{dataMessage.message}</strong>
            {dataMessage.path && <code>{dataMessage.path}</code>}
          </div>
        )}
      </SettingsBlock>

      <SettingsBlock title="Пути">
        {info ? (
          <>
            <PathValue label="Папка данных" value={info.dataPath} />
            <PathValue label="База данных" value={info.databasePath} />
            <PathValue label="Файл настроек" value={info.settingsPath} />
          </>
        ) : (
          <div className="empty-state compact">Пути загружаются...</div>
        )}
      </SettingsBlock>
    </>
  )

  const renderAbout = () => (
    <SettingsBlock title="Tasker">
      <div className="settings-about-card">
        <span className="settings-about-logo" aria-hidden="true">
          <CheckLogoIcon />
        </span>
        <div>
          <h3>{info?.appName ?? 'Tasker'}</h3>
          <p>Версия {info?.version ?? '0.1.0'}</p>
        </div>
      </div>
      <div className="settings-info-list">
        <PathValue label="Режим уведомлений" value={info?.notificationMode ?? 'Загружается...'} />
        <PathValue label="Папка данных" value={info?.dataPath ?? 'Загружается...'} />
        <PathValue label="База данных" value={info?.databasePath ?? 'Загружается...'} />
        <PathValue label="GitHub проекта" value={info?.githubUrl ?? 'Будет указан после публикации репозитория'} />
      </div>
    </SettingsBlock>
  )

  const renderContent = () => {
    if (activeSection === 'appearance') {
      return renderAppearance()
    }

    if (activeSection === 'notifications') {
      return renderNotifications()
    }

    if (activeSection === 'calendar') {
      return renderCalendar()
    }

    if (activeSection === 'tasks') {
      return renderTasks()
    }

    if (activeSection === 'kanban') {
      return renderKanban()
    }

    if (activeSection === 'data') {
      return renderData()
    }

    return renderAbout()
  }

  return (
    <section className="settings-page">
      <aside className="settings-nav" aria-label="Разделы настроек">
        {sections.map((section) => (
          <button
            className={activeSection === section.id ? 'settings-nav-item settings-nav-item-active' : 'settings-nav-item'}
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
          >
            <strong>{section.title}</strong>
            <span>{section.description}</span>
          </button>
        ))}
      </aside>

      <div className="settings-content">
        <header className="settings-content-header">
          <div>
            <h2>{activeSectionMeta.title}</h2>
            <p>{activeSectionMeta.description}</p>
          </div>
        </header>
        {renderContent()}
      </div>
    </section>
  )
}
