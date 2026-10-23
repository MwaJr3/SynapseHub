"""Optional offline Tkinter companion for reviewing user-selected files.

Run from this folder with: python personal_os_companion.py
It intentionally has no network capability and does not modify browser storage.
"""
from __future__ import annotations

from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from core import backup_summary, normalize_statement_rows, review_export


class Companion(ttk.Frame):
    def __init__(self, root: tk.Tk) -> None:
        super().__init__(root, padding=16)
        self.root = root
        self.rows = []
        self.grid(sticky="nsew")
        root.title("Personal OS — Offline Companion")
        root.minsize(700, 460)
        root.columnconfigure(0, weight=1)
        root.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)
        self.rowconfigure(3, weight=1)

        ttk.Label(self, text="Offline review companion", font=("TkDefaultFont", 16, "bold")).grid(row=0, column=0, sticky="w")
        ttk.Label(
            self,
            text="No accounts, bank access, cloud sync, financial advice, or revenue predictions. It only reviews files you choose.",
            wraplength=640,
        ).grid(row=1, column=0, sticky="w", pady=(4, 12))
        controls = ttk.Frame(self)
        controls.grid(row=2, column=0, sticky="ew")
        ttk.Button(controls, text="Review Personal OS backup", command=self.review_backup).pack(side="left")
        ttk.Button(controls, text="Normalize manual finance CSV", command=self.read_csv).pack(side="left", padx=8)
        self.save_button = ttk.Button(controls, text="Save finance review JSON", command=self.save_review, state="disabled")
        self.save_button.pack(side="left")
        self.output = tk.Text(self, height=20, wrap="word", state="disabled")
        self.output.grid(row=3, column=0, sticky="nsew", pady=(12, 0))

    def show(self, message: str) -> None:
        self.output.configure(state="normal")
        self.output.delete("1.0", "end")
        self.output.insert("end", message)
        self.output.configure(state="disabled")

    def review_backup(self) -> None:
        file_name = filedialog.askopenfilename(title="Select a full Personal OS JSON backup", filetypes=[("JSON", "*.json"), ("All files", "*.*")])
        if not file_name:
            return
        try:
            summary = backup_summary(Path(file_name).read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            messagebox.showerror("Cannot review backup", str(error))
            return
        self.show("Recognized full backup — read-only review\n\n" + "\n".join(f"{key.replace('_', ' ').title()}: {value}" for key, value in summary.items()))

    def read_csv(self) -> None:
        file_name = filedialog.askopenfilename(title="Select a manual statement CSV", filetypes=[("CSV", "*.csv"), ("All files", "*.*")])
        if not file_name:
            return
        try:
            self.rows = normalize_statement_rows(Path(file_name).read_text(encoding="utf-8-sig"))
        except (OSError, ValueError) as error:
            messagebox.showerror("Cannot normalize CSV", str(error))
            return
        preview = "\n".join(f"{row.date}  {row.kind:7}  {row.amount:>12} {row.currency}  {row.note}" for row in self.rows[:25])
        self.show(f"Normalized {len(self.rows)} user-supplied rows for review.\n\n{preview or 'No statement rows found.'}")
        self.save_button.configure(state="normal" if self.rows else "disabled")

    def save_review(self) -> None:
        file_name = filedialog.asksaveasfilename(title="Save finance review", defaultextension=".json", filetypes=[("JSON", "*.json")])
        if not file_name:
            return
        try:
            Path(file_name).write_text(review_export(self.rows), encoding="utf-8")
        except OSError as error:
            messagebox.showerror("Cannot save review", str(error))
            return
        self.show("Saved a review-only finance JSON file. It is not a bank feed and cannot restore or overwrite browser data.")


if __name__ == "__main__":
    root = tk.Tk()
    Companion(root)
    root.mainloop()
