const app = {
  registerServiceWorker() {
    const hasServiceWorker = "serviceWorker" in navigator;
    if (!hasServiceWorker) return;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });

    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => console.log("Service Worker enregistré."))
      .catch((err) => {
        console.trace("Erreur d'enregistrement du Service Worker:", err);
      });
  },

  isOnline() {
    return navigator.onLine;
  },

  updateConnectionStatus() {
    const banner = document.getElementById("offline-banner");
    const modeBadge = document.getElementById("app-mode");
    if (!banner || !modeBadge) return;

    const online = app.isOnline();

    banner.textContent = online
      ? "Connexion réseau détectée — les notes sont synchronisées."
      : "Aucune connexion réseau détectée — les notes sont enregistrées localement.";

    banner.classList.toggle("offline-banner--hidden", online);
    modeBadge.textContent = online ? "Mode en ligne" : "Mode local";
    modeBadge.classList.toggle("app-mode--online", online);
    modeBadge.classList.toggle("app-mode--local", !online);
  },

  getFromLocalStorage(key) {
    const value = localStorage.getItem(key);
    if (!value) return [];

    try {
      return JSON.parse(value);
    } catch (error) {
      console.trace(error);
      return [];
    }
  },

  setInLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  getPendingOperations() {
    return app.getFromLocalStorage("pendingOperations");
  },

  setPendingOperations(operations) {
    app.setInLocalStorage("pendingOperations", operations);
  },

  queueOperation(operation) {
    const operations = app.getPendingOperations();
    operations.push(operation);
    app.setPendingOperations(operations);
  },

  async syncPendingOperations() {
    if (!app.isOnline()) return;

    const pendingOperations = app.getPendingOperations();
    if (!pendingOperations.length) return;

    const remainingOperations = [];

    for (const operation of pendingOperations) {
      try {
        if (operation.type === "create") {
          const createdNote = await NoteKeeper.create(operation.note.note);
          if (!createdNote) throw new Error("Erreur lors de la création de la note.");

          const savedNotes = app.getFromLocalStorage("savedNotes");
          const nextNotes = savedNotes.filter((savedNote) => savedNote.id !== operation.note.id);
          nextNotes.push({ ...operation.note, ...createdNote });
          app.setInLocalStorage("savedNotes", nextNotes);
        } else if (operation.type === "update") {
          if (!(await NoteKeeper.update(operation.note))) {
            throw new Error("Erreur lors de la mise à jour de la note.");
          }

          const savedNotes = app.getFromLocalStorage("savedNotes");
          const nextNotes = savedNotes.map((savedNote) =>
            savedNote.id === operation.note.id ? { ...savedNote, ...operation.note } : savedNote
          );
          app.setInLocalStorage("savedNotes", nextNotes);
        } else if (operation.type === "delete") {
          if (!(await NoteKeeper.delete(operation.id))) {
            throw new Error("Erreur lors de la suppression de la note.");
          }

          const savedNotes = app.getFromLocalStorage("savedNotes");
          app.setInLocalStorage(
            "savedNotes",
            savedNotes.filter((savedNote) => savedNote.id !== operation.id)
          );
        }
      } catch (error) {
        console.trace(error);
        remainingOperations.push(operation);
        app.logOperation(error.message || "Erreur de synchronisation", false);
      }
    }

    app.setPendingOperations(remainingOperations);
  },

  playActionSound(action) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const tones = {
      create: { type: "triangle", frequency: 660, duration: 0.12 },
      update: { type: "sine", frequency: 520, duration: 0.14 },
      delete: { type: "sawtooth", frequency: 220, duration: 0.22 },
    };

    const config = tones[action] || tones.create;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = config.type;
    oscillator.frequency.value = config.frequency;

    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + config.duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + config.duration);
    oscillator.onended = () => {
      context.close().catch(() => {});
    };
  },

  logOperation(operation, isSuccess = true, variant = "success") {
    const container = document.getElementById("logs-container");
    if (!container) return;

    const logHeader = document.createElement("div");
    const logEntry = document.createElement("div");
    const logDate = document.createElement("span");
    const logOperation = document.createElement("p");

    logDate.textContent = new Date().toLocaleString();
    logOperation.textContent = operation;

    let className = "log--success";

    if (variant === "delete") {
      className = "log--delete";
    } else if (!isSuccess) {
      className = "log--error";
    }

    logEntry.classList.add("log", className);

    logHeader.append(logDate);
    logEntry.append(logHeader, logOperation);
    container.appendChild(logEntry);
  },

  async handleCreateNote(noteContent) {
    try {
      const savedNotes = app.getFromLocalStorage("savedNotes");

      if (!app.isOnline()) {
        const localNote = {
          id: Date.now() + Math.random(),
          note: noteContent,
        };

        savedNotes.push(localNote);
        app.setInLocalStorage("savedNotes", savedNotes);
        app.queueOperation({ type: "create", note: localNote });
        app.addNoteToUI(localNote);
        app.logOperation("Note enregistrée localement", true, "create");
        app.playActionSound("create");
        return true;
      }

      const newNote = await NoteKeeper.create(noteContent);
      if (!newNote) {
        throw new Error("Erreur lors de la création de la note.");
      }

      savedNotes.push(newNote);
      app.setInLocalStorage("savedNotes", savedNotes);
      app.addNoteToUI(newNote);
      app.logOperation("Création d'une note", true, "create");
      app.playActionSound("create");
      return true;
    } catch (error) {
      console.trace(error);
      app.logOperation(error.message, false, "error");
      return false;
    }
  },

  async handleUpdateNote(note) {
    try {
      const savedNotes = app.getFromLocalStorage("savedNotes");
      let notes = savedNotes;

      if (!app.isOnline()) {
        notes = notes.map((savedNote) =>
          savedNote.id === note.id ? { ...savedNote, ...note } : savedNote
        );

        app.setInLocalStorage("savedNotes", notes);
        app.queueOperation({ type: "update", note });
        app.logOperation("Mise à jour de note sauvegardée localement", true, "update");
        app.playActionSound("update");
        return true;
      }

      if (!(await NoteKeeper.update(note))) {
        throw new Error("Erreur lors de la mise à jour de la note.");
      }

      notes = notes.map((savedNote) =>
        savedNote.id === note.id ? { ...savedNote, ...note } : savedNote
      );
      app.setInLocalStorage("savedNotes", notes);
      app.logOperation("Mise à jour d'une note", true, "update");
      app.playActionSound("update");
      return true;
    } catch (error) {
      console.trace(error);
      app.logOperation(error.message, false, "error");
      return false;
    }
  },

  async handleDeleteNote(noteId, noteElement) {
    try {
      const notesContainer = document.getElementById("notes-container");
      const savedNotes = app.getFromLocalStorage("savedNotes");

      if (!app.isOnline()) {
        app.setInLocalStorage(
          "savedNotes",
          savedNotes.filter((note) => note.id !== noteId)
        );
        app.queueOperation({ type: "delete", id: noteId });

        if (notesContainer && noteElement) {
          notesContainer.removeChild(noteElement);
        }

        app.logOperation("Suppression d'une note sauvegardée localement", false, "delete");
        app.playActionSound("delete");
        return true;
      }

      if (!(await NoteKeeper.delete(noteId))) {
        throw new Error("Erreur lors de la suppression de la note.");
      }

      app.setInLocalStorage(
        "savedNotes",
        savedNotes.filter((note) => note.id !== noteId)
      );

      if (notesContainer && noteElement) {
        notesContainer.removeChild(noteElement);
      }

      app.logOperation("Suppression d'une note", false, "delete");
      app.playActionSound("delete");
      return true;
    } catch (error) {
      console.trace(error);
      app.logOperation(error.message, false, "delete");
      return false;
    }
  },

  async createNoteHandler(event) {
    event.preventDefault();
    const noteContent = document.getElementById("note-creator-content").value.trim();
    if (!noteContent) return;

    if (await app.handleCreateNote(noteContent)) {
      document.getElementById("note-creator-content").value = "";
    }
  },

  addNoteToUI(note) {
    const notesContainer = document.getElementById("notes-container");
    if (!notesContainer) return;

    const noteElement = document.createElement("form");
    const noteContent = document.createElement("textarea");
    const updateButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    noteElement.className = "item";
    noteContent.value = note.note;
    deleteButton.textContent = "Supprimer";
    updateButton.textContent = "Modifier";
    deleteButton.type = "button";
    updateButton.type = "submit";

    deleteButton.addEventListener(
      "click",
      app.handleDeleteNote.bind(null, note.id, noteElement)
    );

    noteElement.addEventListener("submit", async (event) => {
      event.preventDefault();
      const updatedNoteContent = noteContent.value.trim();
      if (!updatedNoteContent) return;

      await app.handleUpdateNote({
        id: note.id,
        note: updatedNoteContent,
      });
    });

    noteElement.append(deleteButton, updateButton, noteContent);
    notesContainer.appendChild(noteElement);
  },

  async loadNotes() {
    const notesContainer = document.getElementById("notes-container");
    if (notesContainer) notesContainer.innerHTML = "";

    if (app.isOnline()) {
      try {
        const remoteNotes = await NoteKeeper.getAll();
        if (Array.isArray(remoteNotes) && remoteNotes.length) {
          app.setInLocalStorage("savedNotes", remoteNotes);
        }
      } catch (error) {
        console.trace("Erreur lors du chargement des notes :", error);
        app.logOperation("Erreur lors du chargement des notes", false);
      }
    }

    const notes = app.getFromLocalStorage("savedNotes");
    notes.forEach((note) => app.addNoteToUI(note));
    app.logOperation("Chargement des notes", true, "info");

    if (app.isOnline()) {
      await app.syncPendingOperations();
      if (notesContainer) {
        notesContainer.innerHTML = "";
        app.getFromLocalStorage("savedNotes").forEach((note) => app.addNoteToUI(note));
      }
    }
  },

  attachDOMEvents() {
    const noteCreator = document.getElementById("note-creator");
    if (noteCreator) {
      noteCreator.addEventListener("submit", app.createNoteHandler);
    }

    window.addEventListener("online", async () => {
      app.updateConnectionStatus();
      app.logOperation("En ligne", true, "info");
      await app.syncPendingOperations();
      await app.loadNotes();
    });

    window.addEventListener("offline", () => {
      app.updateConnectionStatus();
      app.logOperation("Hors ligne", false, "info");
    });
  },

  async init() {
    app.logOperation("Initialisation de l'application.", true, "info");
    app.updateConnectionStatus();
    app.registerServiceWorker();
    app.attachDOMEvents();

    try {
      await NoteKeeper.init();
    } catch (error) {
      console.warn("Impossible d'initialiser le serveur de notification :", error);
    }

    await app.loadNotes();
  },
};

document.addEventListener("DOMContentLoaded", app.init);
