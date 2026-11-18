import { AlignCenter, AlignLeft, AlignRight, Bold, ChevronDown, Italic, List, ListOrdered, Search, Underline } from 'lucide-react'
import { Menu } from './ui.jsx'

export const paragraphStyles = { normal: 'Normal', title: 'Title', heading1: 'Heading 1', heading2: 'Heading 2' }
const marks = [{ name: 'bold', label: 'Bold', Icon: Bold }, { name: 'italic', label: 'Italic', Icon: Italic }, { name: 'underline', label: 'Underline', Icon: Underline }]
const alignments = [{ name: 'left', label: 'Align left', Icon: AlignLeft }, { name: 'center', label: 'Align center', Icon: AlignCenter }, { name: 'right', label: 'Align right', Icon: AlignRight }]
const lists = [{ name: 'bullet', label: 'Bulleted list', Icon: List }, { name: 'number', label: 'Numbered list', Icon: ListOrdered }]

export function CommandButton({ label, Icon, children, active, className = '', ...props }) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active}
    className={`${children ? 'button ghost command-button' : 'icon-button'} ${active ? 'command-active' : ''} ${className}`}
    {...props}><Icon size={16} />{children}</button>
}

export function HomeCommands({ block, activeMarks, editable, selection, onFind }) {
  const style = paragraphStyles[block.style]
  const formatting = marks.map(({ name, label, Icon }) => ({ label, icon: <Icon size={15} />, checked: activeMarks.includes(name),
    action: () => selection.formatMark(name), disabled: !editable }))
  const listItems = lists.map(({ name, label, Icon }) => ({ label, icon: <Icon size={15} />, checked: block.list === name,
    action: () => selection.formatBlock({ list: block.list === name ? null : name }), disabled: !editable }))
  const alignmentItems = alignments.map(({ name, label, Icon }) => ({ label, icon: <Icon size={15} />, checked: block.alignment === name,
    action: () => selection.formatBlock({ alignment: name }), disabled: !editable }))
  const styleItems = Object.entries(paragraphStyles).map(([name, label]) => ({
    label, checked: block.style === name, action: () => selection.formatBlock({ style: name }), disabled: !editable,
  }))
  const renderItems = (items, icons) => items.map((item, index) => <CommandButton key={item.label} label={item.label}
    Icon={icons[index].Icon} active={item.checked} disabled={item.disabled} onMouseDown={(event) => event.preventDefault()} onClick={item.action} />)
  return <>
    <div className="command-group">{renderItems(formatting, marks)}</div>
    {editable && <Menu className="style-picker" label="Paragraph styles" text={style} icon={<ChevronDown size={13} />} align="start" items={styleItems} />}
    <div className="command-group wide-commands">{renderItems(listItems, lists)}</div>
    <div className="command-group wide-commands">{renderItems(alignmentItems, alignments)}</div>
    {editable && <Menu className="narrow-commands" label="More formatting commands" items={[...listItems, ...alignmentItems]} />}
    <CommandButton label="Find in document" Icon={Search} onClick={onFind}><span>Find</span></CommandButton>
  </>
}
