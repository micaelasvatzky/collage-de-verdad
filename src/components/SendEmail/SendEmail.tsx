"use client";

import { useState, type RefObject } from "react";
import html2canvas from "html2canvas";
import styles from "./SendEmail.module.css";

interface Props {
  onDeselect: () => void;
  photoRef: RefObject<HTMLDivElement | null>;
}

const FORM_SUBMIT_EMAIL = "micaelasvatzky@gmail.com";

export default function SendEmail({ onDeselect, photoRef }: Props) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setStatusMsg("");

    if (!email) {
      setStatus("error");
      setStatusMsg("Poné tu mail");
      return;
    }

    setSending(true);
    try {
      onDeselect();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      const board = photoRef.current;
      if (!board) throw new Error("No encuentro el recuadro blanco");

      const rect = board.getBoundingClientRect();

      // Capturamos ÚNICAMENTE el recuadro blanco + lo que está encima
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollX: 0,
        scrollY: 0,
        scale: 2,
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png", 0.95);
      });

      if (!blob) throw new Error("No pude generar la imagen");

      // Subimos a catbox.moe (gratis, funciona desde navegador)
      const uploadForm = new FormData();
      uploadForm.append("reqtype", "fileupload");
      uploadForm.append("fileToUpload", blob, "collage-de-verdad.png");

      const uploadRes = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        body: uploadForm,
      });

      const imageUrl = (await uploadRes.text()).trim();
      if (!imageUrl.startsWith("http")) {
        throw new Error("No pude subir la imagen");
      }

      // Enviamos el link directo por mail con FormSubmit
      const mailForm = new FormData();
      mailForm.append("_subject", "Tu collage de verdad");
      mailForm.append("email", email);
      mailForm.append("_replyto", email);
      mailForm.append("Mensaje", `Hola!\n\nAcá tenés el link de tu collage:\n${imageUrl}\n\nPodés guardarlo desde ahí.`);
      mailForm.append("_captcha", "false");
      mailForm.append("_template", "table");

      const mailRes = await fetch(`https://formsubmit.co/ajax/${FORM_SUBMIT_EMAIL}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: mailForm,
      });

      const mailData = await mailRes.json();

      if (mailRes.ok && (mailData.success === "true" || mailData.success === true)) {
        setStatus("success");
        setStatusMsg("¡Listo! Te llegó el mail con el link de tu collage.");
        setEmail("");
        setShowForm(false);
      } else {
        throw new Error(mailData.message || "Error al enviar el mail");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Algo salió mal";
      setStatus("error");
      setStatusMsg(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.container}>
      {!showForm ? (
        <button
          type="button"
          className={styles.doneButton}
          onClick={() => {
            setShowForm(true);
            setStatus(null);
            setStatusMsg("");
          }}
          disabled={sending}
        >
          Terminé
        </button>
      ) : (
        <form className={styles.form} onSubmit={handleSend}>
          <input
            type="email"
            placeholder="Poné tu mail..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={sending}
            autoFocus
          />
          <div className={styles.actions}>
            <button type="button" onClick={() => setShowForm(false)} disabled={sending} className={styles.cancel}>
              Cancelar
            </button>
            <button type="submit" disabled={sending} className={styles.button}>
              {sending ? "Enviando..." : "Enviar"}
            </button>
          </div>
          {status && (
            <p className={`${styles.status} ${status === "success" ? styles.success : styles.error}`}>
              {statusMsg}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
