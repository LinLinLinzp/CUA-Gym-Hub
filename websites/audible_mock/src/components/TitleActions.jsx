import { useConfirm } from './Confirm.jsx'
import { TitleButton } from './ui.jsx'
import { useAccount } from '../state/AccountProvider.jsx'
import { activeLibrary, activeWish, purchaseBlock, titleLabel } from '../state/selectors.js'

export function TitleActions({ title, showWish = true, removeWish, compact = false }) {
  const { state, act } = useAccount()
  const confirm = useConfirm()

  if (!title?.id) {
    return removeWish
      ? <div className="title-actions">
          <TitleButton className="button quiet" title={titleLabel(title)} onClick={removeWish}>Remove from Wish List</TitleButton>
        </div>
      : null
  }

  const label = titleLabel(title)
  const owned = activeLibrary(state, title.id)
  const saved = activeWish(state, title.id)
  const reason = purchaseBlock(state, title, new Date())
  const canAdd = title.included === true && !owned
  const action = (type) => ({ type, titleId: title.id })

  return (
    <div className={`title-actions ${compact ? 'compact-actions' : ''}`}>
      {owned && <span className="pill positive">In your Library</span>}
      {canAdd && <TitleButton className="button" title={label} onClick={() => act(action('add_included'))}>Add to Library</TitleButton>}
      {!reason && <TitleButton className={canAdd ? 'button secondary' : 'button'} title={label}
        onClick={() => confirm(label, action('buy'))}>Buy with 1 credit</TitleButton>}
      {!!reason && !canAdd && !owned && <span className="action-reason">{reason}</span>}
      {removeWish ? (
        <TitleButton className="button quiet" title={label} onClick={removeWish}>Remove from Wish List</TitleButton>
      ) : showWish && !owned && (
        <TitleButton className="button quiet" title={label} onClick={() => act(action(saved ? 'remove_wish' : 'save_wish'))}>
          {saved ? 'Remove from Wish List' : 'Add to Wish List'}
        </TitleButton>
      )}
    </div>
  )
}
