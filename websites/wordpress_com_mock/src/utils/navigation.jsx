import React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

export const dashboardPath = '/wp-admin/'
export const mediaPath = '/wp-admin/upload.php'
export const commentsPath = '/wp-admin/edit-comments.php'

export function listPath(type, status) {
  const params = {}
  if (type === 'page') params.post_type = 'page'
  if (status && status !== 'all') params.post_status = status
  return routePath('/wp-admin/edit.php', params)
}

export function newPath(type) {
  return routePath('/wp-admin/post-new.php', type === 'page' ? { post_type: 'page' } : {})
}

export const editorPath = (id) => routePath('/wp-admin/post.php', { post: id, action: 'edit' })
export const previewPath = (type, id) => '/preview/' + type + '/' + encodeURIComponent(id)
export const commentTargetPath = (id) => routePath(commentsPath, { contentId: id })

export function routePath(path, values) {
  const params = new URLSearchParams(values)
  return params.size ? path + '?' + params : path
}

export function useSessionRouting() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const sid = params.get('sid') || sessionStorage.getItem('mock_sid')
  const href = (path) => {
    const url = new URL(path, window.location.origin)
    // Harbor's static host rejects unescaped file extensions on SPA routes.
    if (url.pathname.startsWith('/wp-admin/')) url.pathname = url.pathname.replace(/\.php$/, '%2Ephp')
    if (sid) url.searchParams.set('sid', sid)
    return url.pathname + url.search + url.hash
  }
  return { href, go: (path, options) => navigate(href(path), options) }
}

export function SiteLink({ to, ...props }) {
  const { href } = useSessionRouting()
  return <Link to={href(to)} {...props} />
}
