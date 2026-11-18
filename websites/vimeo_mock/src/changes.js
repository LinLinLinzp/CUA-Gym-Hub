const event = (patch, ...events) => ({ patch, events })

export function createRecord(key, record, type, details) {
  return (state, stamp) => event({
    [key]: [...state[key], { ...record, ...stamp, createdAt: stamp.updatedAt, createdBy: stamp.updatedBy }],
  }, [type, record.id, details])
}

function patchRecord(key, id, getChange, type) {
  return (state, stamp) => {
    const record = state[key].find((record) => record.id === id)
    if (!record) return
    const result = getChange(record, state)
    if (!result) return
    return event({
      [key]: state[key].map((item) => item === record ? { ...item, ...result.fields, ...stamp } : item),
    }, [type, id, result.details])
  }
}

function fieldChanges(old, next) {
  return Object.keys(next).filter((key) => JSON.stringify(old[key]) !== JSON.stringify(next[key]))
}

export function saveDetails(kind, id, fields) {
  return patchRecord(`${kind}s`, id, (record) => {
    const previous = { title: record.title ?? '', description: record.description ?? '', tags: record.tags ?? [] }
    const changedFields = fieldChanges(previous, fields)
    if (changedFields.length) return { fields, details: { changedFields } }
  }, `${kind}.updated`)
}

export function savePrivacy(kind, id, settings) {
  return patchRecord(`${kind}s`, id, (record) => {
    const previous = {
      mode: kind === 'video' ? 'unlisted' : 'private',
      password: null,
      ...(kind === 'video' ? { allowDownloads: false } : {}),
      ...record.privacy,
    }
    const changedFields = fieldChanges(previous, settings)
    if (changedFields.length) {
      return {
        fields: { privacy: { ...record.privacy, ...settings } },
        details: { previousMode: previous.mode, mode: settings.mode, changedFields },
      }
    }
  }, `${kind}.privacy_changed`)
}

export function deleteVideo(id) {
  return (state, stamp) => {
    if (!state.videos.some((video) => video.id === id)) return
    const commentIds = state.reviewComments.filter((comment) => comment.videoId === id).map((comment) => comment.id)
    const showcaseIds = []
    const showcases = state.showcases.map((showcase) => {
      if (!showcase.videoIds?.includes(id)) return showcase
      showcaseIds.push(showcase.id)
      return { ...showcase, videoIds: showcase.videoIds.filter((member) => member !== id), ...stamp }
    })
    return event({
      videos: state.videos.filter((video) => video.id !== id),
      reviewComments: state.reviewComments.filter((comment) => comment.videoId !== id),
      showcases,
    }, ['video.deleted', id, { commentIds, showcaseIds }])
  }
}

export function deleteShowcase(id) {
  return (state) => {
    const showcase = state.showcases.find((showcase) => showcase.id === id)
    if (showcase) return event({
      showcases: state.showcases.filter((showcase) => showcase.id !== id),
    }, ['showcase.deleted', id, { videoIds: showcase.videoIds ?? [] }])
  }
}

export function addVideos(showcaseIds, selection) {
  return (state, stamp) => {
    const existingIds = new Set(state.videos.map((video) => video.id))
    const validIds = [...new Set(selection)].filter((id) => existingIds.has(id))
    const destinations = new Set(showcaseIds)
    const events = []
    const showcases = state.showcases.map((showcase) => {
      if (!destinations.has(showcase.id)) return showcase
      const current = showcase.videoIds ?? []
      const affectedVideoIds = validIds.filter((id) => !current.includes(id))
      if (!affectedVideoIds.length) return showcase
      const videoIds = [...current, ...affectedVideoIds]
      events.push(['showcase.videos_added', showcase.id, { affectedVideoIds, videoIds }])
      return { ...showcase, videoIds, ...stamp }
    })
    if (events.length) return event({ showcases }, ...events)
  }
}

export function changeMember(showcaseId, videoId, direction) {
  const type = direction ? 'showcase.videos_reordered' : 'showcase.video_removed'
  return patchRecord('showcases', showcaseId, (showcase, state) => {
    const videoIds = [...(showcase.videoIds ?? [])]
    const index = videoIds.indexOf(videoId)
    if (index < 0) return
    if (direction) {
      const existing = new Set(state.videos.map((video) => video.id))
      let neighbor = index + direction
      while (neighbor >= 0 && neighbor < videoIds.length && !existing.has(videoIds[neighbor])) neighbor += direction
      if (neighbor < 0 || neighbor >= videoIds.length) return
      ;[videoIds[neighbor], videoIds[index]] = [videoId, videoIds[neighbor]]
    } else {
      videoIds.splice(index, 1)
    }
    return { fields: { videoIds }, details: { affectedVideoIds: [videoId], videoIds } }
  }, type)
}

export function postComment(record) {
  return (state, stamp) => {
    const { id, videoId, parentId, timeSeconds } = record
    if (!state.videos.some((video) => video.id === videoId)) return
    if (parentId && !state.reviewComments.some((comment) =>
      comment.id === parentId && comment.videoId === videoId && !comment.parentId && comment.status !== 'resolved'
    )) return
    const comment = {
      ...record, ...stamp, authorId: stamp.updatedBy, createdAt: stamp.updatedAt,
      status: 'open', resolvedAt: null, resolvedBy: null,
    }
    return event({ reviewComments: [...state.reviewComments, comment] },
      [parentId ? 'comment.replied' : 'comment.created', id, { videoId, parentId, timeSeconds }])
  }
}

export function setThreadStatus(videoId, rootId, resolved) {
  return (state, stamp) => {
    const root = state.reviewComments.find((comment) => comment.id === rootId && comment.videoId === videoId && !comment.parentId)
    if (!root || (root.status === 'resolved') === resolved) return
    const status = resolved ? 'resolved' : 'open'
    const commentIds = []
    const reviewComments = state.reviewComments.map((comment) => {
      if (comment.videoId !== videoId || (comment !== root && comment.parentId !== rootId)) return comment
      commentIds.push(comment.id)
      return {
        ...comment, ...stamp, status,
        resolvedAt: resolved ? stamp.updatedAt : null, resolvedBy: resolved ? stamp.updatedBy : null,
      }
    })
    return event({ reviewComments },
      [resolved ? 'comment.resolved' : 'comment.reopened', rootId, { videoId, commentIds, status }])
  }
}
