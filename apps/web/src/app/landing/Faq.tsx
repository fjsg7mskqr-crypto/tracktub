"use client";

import { useState } from "react";
import { FAQS } from "./content";
import styles from "./landing.module.css";

/** Accordion — first item open, one open at a time (as in the design). */
export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <div>
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className={styles.faqItem}>
            <button
              type="button"
              id={`faq-q-${i}`}
              className={styles.faqBtn}
              aria-expanded={isOpen}
              aria-controls={`faq-a-${i}`}
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              <span className={styles.faqQ}>{f.q}</span>
              <span aria-hidden="true" className={styles.faqSign}>
                {isOpen ? "−" : "+"}
              </span>
            </button>
            <p
              id={`faq-a-${i}`}
              role="region"
              aria-labelledby={`faq-q-${i}`}
              className={styles.faqA}
              hidden={!isOpen}
            >
              {f.a}
            </p>
          </div>
        );
      })}
    </div>
  );
}
