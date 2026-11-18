import React, { createContext, useContext, useState } from "react";
import { useApp } from "../store/AppContext";
import { Modal, Button, Field, Icon } from "./ui";
const SaveContext = createContext(null);
export const useSave = () => useContext(SaveContext);
export function WishlistCover({ items = [], className = "" }) {
  const { state } = useApp();
  const images = items
    .map((i) => state.listings.find((l) => l.id === i.listingId)?.photos?.[0])
    .filter(Boolean)
    .slice(0, 4);
  return (
    <div
      className={`wishlist-cover ${images.length >= 3 ? "mosaic" : ""} ${className}`}
    >
      {images.length ? (
        images
          .slice(0, images.length >= 3 ? 4 : 1)
          .map((p, i) => <img src={p} key={i} alt="" />)
      ) : (
        <Icon name="Heart" size={40} />
      )}
    </div>
  );
}
export default function SaveProvider({ children }) {
  const { state, isSaved, actions, notify } = useApp(),
    [modal, setModal] = useState(null),
    [name, setName] = useState("");
  const open = (listingId, move = false) => {
    if (isSaved(listingId) && !move) {
      actions.removeSaved(listingId);
      return;
    }
    setName("");
    setModal({ listingId, move, create: !state.wishlists.length });
  };
  return (
    <SaveContext.Provider
      value={{
        save: open,
        create: () => {
          setName("");
          setModal({ create: true });
        },
      }}
    >
      {children}
      {modal && (
        <Modal
          title={modal.create ? "Create wishlist" : "Save to wishlist"}
          onClose={() => setModal(null)}
          footer={
            modal.create ? (
              <>
                <Button variant="text" onClick={() => setModal(null)}>
                  Cancel
                </Button>
                <Button
                  variant="dark"
                  disabled={!name.trim()}
                  onClick={() => {
                    actions.createWishlist(name, modal.listingId, modal.move);
                    const id = modal.listingId;
                    if (id)
                      notify(`Saved to ${name}`, {
                        label: "Change",
                        onClick: () => open(id, true),
                      });
                    setModal(null);
                  }}
                >
                  Create
                </Button>
              </>
            ) : (
              <Button
                variant="dark"
                onClick={() => setModal({ ...modal, create: true })}
              >
                Create new wishlist
              </Button>
            )
          }
        >
          {modal.create ? (
            <>
              <Field
                autoFocus
                label="Name"
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <small>{name.length}/50 characters</small>
            </>
          ) : (
            <div className="wishlist-picker">
              {state.wishlists.map((w) => (
                <button
                  key={w.id}
                  disabled={(w.items || []).length >= 100}
                  title={
                    (w.items || []).length >= 100
                      ? "This wishlist is full"
                      : w.name
                  }
                  onClick={() => {
                    actions.saveListing(w.id, modal.listingId, modal.move);
                    const id = modal.listingId;
                    notify(`Saved to ${w.name}`, {
                      label: "Change",
                      onClick: () => open(id, true),
                    });
                    setModal(null);
                  }}
                >
                  <WishlistCover items={w.items} />
                  <strong>{w.name}</strong>
                  <small>
                    {w.items?.length || 0} saved
                    {(w.items || []).length >= 100 ? " · Full" : ""}
                  </small>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
    </SaveContext.Provider>
  );
}
