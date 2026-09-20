/**
 * @typedef {Object} Note
 * @property {number} id The note ID.
 * @property {string} note The note content.
 */

/**
 * @typedef {Object} MessageData
 * @property {string} identifier The client identifier.
 * @property {string} message The message content.
 * @property {string} created_at The message date.
 */

class NoteKeeper {
  static BASE_URL = "local";
  static #identifier = "local-client";
  static #initialized = false;

  static get vapidKey() {
    return null;
  }

  static connectToNotificationServer() {
    return null;
  }

  static async onMessage() {
    return null;
  }

  static async getIdentifier() {
    return NoteKeeper.#identifier;
  }

  static async init() {
    if (NoteKeeper.#initialized) return;
    NoteKeeper.#initialized = true;
    if (!localStorage.getItem("noteKeeperNotes")) {
      localStorage.setItem("noteKeeperNotes", JSON.stringify([]));
    }
    if (!localStorage.getItem("noteKeeperMessages")) {
      localStorage.setItem("noteKeeperMessages", JSON.stringify([]));
    }
  }

  static async sendMessage() {
    return null;
  }

  static async getAll() {
    const notes = JSON.parse(localStorage.getItem("noteKeeperNotes") || "[]");
    return Array.isArray(notes) ? notes : [];
  }

  static async create(note) {
    const notes = await NoteKeeper.getAll();
    const newNote = {
      id: Date.now() + Math.random(),
      note,
    };

    notes.push(newNote);
    localStorage.setItem("noteKeeperNotes", JSON.stringify(notes));
    return newNote;
  }

  static async delete(...ids) {
    const currentIds = ids.flat();
    const notes = await NoteKeeper.getAll();
    const filteredNotes = notes.filter((note) => !currentIds.includes(note.id));
    localStorage.setItem("noteKeeperNotes", JSON.stringify(filteredNotes));
    return true;
  }

  static async update(...notesToUpdate) {
    const notes = await NoteKeeper.getAll();
    const nextNotes = notes.map((note) => {
      const found = notesToUpdate.find((incoming) => incoming.id === note.id);
      return found ? { ...note, ...found } : note;
    });

    localStorage.setItem("noteKeeperNotes", JSON.stringify(nextNotes));
    return true;
  }

  static isFromSender() {
    return true;
  }

  static async getMessages() {
    const messages = JSON.parse(localStorage.getItem("noteKeeperMessages") || "[]");
    return Array.isArray(messages) ? messages : [];
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof NoteKeeper !== "undefined") {
      NoteKeeper.init();
    }
  });
}
