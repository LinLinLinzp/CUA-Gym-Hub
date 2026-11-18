import React, { useState } from "react";
import { useStore } from "../store/AppStore";
import { Avatar, Button, useNav, useUI } from "./UI";
import { colors } from "../utils/art";
export function ProfileModal() {
  const { user, actions } = useStore(),
    { close, notify } = useUI(),
    nav = useNav(),
    [name, setName] = useState(user.name || ""),
    [pronouns, setPronouns] = useState(user.pronouns || ""),
    [bio, setBio] = useState(user.bio || ""),
    [color, setColor] = useState(user.avatarColor || "#C7C7C7");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        actions.patch("users", user.id, {
          name: name.trim(),
          pronouns,
          bio,
          avatarColor: color,
        });
        close();
        notify("Profile saved");
      }}
    >
      <h2>Profile information</h2>
      <div className="row">
        <Avatar user={{ name, avatarColor: color }} size={72} />
        <Button
          type="button"
          variant="text"
          onClick={() => setColor("#C7C7C7")}
        >
          Remove
        </Button>
      </div>
      <div className="swatches">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            className={color === c ? "selected" : ""}
            aria-label={"Photo colour " + c}
            style={{ background: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      {[
        ["Name", name, setName, 50],
        ["Pronouns", pronouns, setPronouns, 12],
        ["Short bio", bio, setBio, 160],
      ].map(([label, value, set, max]) => (
        <label key={label}>
          {label}
          <input
            aria-label={label}
            required={label === "Name"}
            maxLength={max}
            value={value}
            onChange={(e) => set(e.target.value)}
          />
          <small>
            {value.length}/{max}
          </small>
        </label>
      ))}
      <p>
        <Button
          type="button"
          variant="text"
          onClick={() => {
            close();
            nav("/@" + user.username + "/about");
          }}
        >
          About Page
        </Button>
      </p>
      <div className="actions">
        <Button type="button" variant="outline" onClick={close}>
          Cancel
        </Button>
        <Button disabled={!name.trim()}>Save</Button>
      </div>
    </form>
  );
}
