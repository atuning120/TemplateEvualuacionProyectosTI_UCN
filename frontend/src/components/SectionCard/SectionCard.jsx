// src/components/SectionCard/SectionCard.jsx
import React from 'react';
// Importamos el CSS Module
import styles from './SectionCard.module.css';

const SectionCard = ({ number, title, children }) => {
  return (
    <div className={styles.card}>
      <div className={styles.titleContainer}>
        {number && <div className={styles.number}>{number}</div>}
        <h2 className={styles.title}>{title}</h2>
      </div>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
};

export default SectionCard;