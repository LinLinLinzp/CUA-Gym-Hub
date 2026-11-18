import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';

export async function checkReviewRegressions({ AppContext, getContext, SaveProvider, browse, messages }) {
  let navigate, scrolls = 0;
  function Navigation() {
    navigate = useNavigate();
    return null;
  }
  const harness = (child, entry, path) => React.createElement(
    AppContext.Provider, { value: getContext() },
    React.createElement(MemoryRouter, { initialEntries: [entry] },
      React.createElement(Navigation),
      React.createElement(SaveProvider, null,
        React.createElement(Routes, null,
          React.createElement(Route, { path, element: child }),
          React.createElement(Route, { path: '/', element: React.createElement('p', null, 'Home') }),
        ),
      ),
    ),
  );
  const thread = () => harness(React.createElement(messages.default), '/messages/conv_003', '/messages/:id');
  let tree;
  await act(() => {
    tree = TestRenderer.create(thread(), { createNodeMock: () => ({
      // Modern scrollIntoView returns a Promise. It must never become effect cleanup.
      scrollIntoView() { scrolls++; return Promise.resolve(); },
      focus() {},
    }) });
  });
  await act(() => tree.root.findByProps({ 'aria-label': 'Write a message' }).props.onChange({
    target: { value: 'Could we arrive at 3pm?', style: {}, scrollHeight: 48 },
  }));
  await act(() => tree.root.findByProps({ 'aria-label': 'Send message' }).props.onClick());
  await act(() => tree.update(thread()));
  assert(JSON.stringify(tree.toJSON()).includes('Could we arrive at 3pm?'));
  await act(() => navigate('/messages/conv_001'));
  assert(tree.root.findByProps({ 'aria-label': 'Write a message' }));
  await act(() => navigate('/'));
  assert(JSON.stringify(tree.toJSON()).includes('Home'));
  await act(() => tree.unmount());
  assert(scrolls >= 4);

  const row = { scrollLeft: 0, clientWidth: 1200, scrollWidth: 1200,
    scrollBy({ left }) {
      this.scrollLeft = Math.max(0, Math.min(this.scrollWidth - this.clientWidth, this.scrollLeft + left));
    },
  };
  const originalObserver = global.ResizeObserver;
  let resize, disconnected = false;
  global.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
    disconnect() { disconnected = true; }
  };
  const listings = getContext().state.listings.slice(0, 5);
  const carousel = (items) => harness(React.createElement(browse.Carousel, { title: 'Homes', listings: items }), '/carousel', '/carousel');
  try {
    await act(() => {
      tree = TestRenderer.create(carousel(listings), { createNodeMock: (element) => element.props.className === 'carousel' ? row : null });
    });
    const previous = () => tree.root.findByProps({ 'aria-label': 'Previous Homes' });
    const next = () => tree.root.findByProps({ 'aria-label': 'Next Homes' });
    assert(previous().props.disabled);
    assert(next().props.disabled, 'No overflow: both arrows are disabled');
    row.clientWidth = 500;
    await act(() => resize());
    assert(!next().props.disabled, 'Resize enables Next when content overflows');
    await act(() => {
      next().props.onClick();
      tree.root.findByProps({ className: 'carousel' }).props.onScroll();
    });
    assert(row.scrollLeft > 0);
    assert(!previous().props.disabled);
    await act(() => {
      next().props.onClick();
      tree.root.findByProps({ className: 'carousel' }).props.onScroll();
    });
    assert(next().props.disabled, 'Next is disabled at the end');
    await act(() => {
      previous().props.onClick();
      tree.root.findByProps({ className: 'carousel' }).props.onScroll();
    });
    assert(!next().props.disabled);
    row.scrollLeft = 0;
    row.scrollWidth = 500;
    await act(() => tree.update(carousel(listings.slice(0, 1))));
    assert(previous().props.disabled && next().props.disabled, 'Content changes remeasure overflow');
    await act(() => tree.unmount());
    assert(disconnected);
  } finally {
    global.ResizeObserver = originalObserver;
  }
  console.log('PASS message send/thread switch/navigation with Promise-returning scrolling; carousel overflow, resize, boundaries and content changes');
}
