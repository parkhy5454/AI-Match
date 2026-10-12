'use client';

import { useState, useMemo } from 'react';
import {
  validatePassword,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  calculatePasswordScore
} from '@/lib/passwordValidator';

export default function PasswordPolicyValidator({ password, onChange }) {
  const validation = useMemo(() => {
    return validatePassword(password);
  }, [password]);

  const score = useMemo(() => {
    return calculatePasswordScore(password);
  }, [password]);

  const requirements = [
    {
      label: '최소 8자 이상',
      met: password.length >= 8,
    },
    {
      label: '대문자(A-Z) 포함',
      met: /[A-Z]/.test(password),
    },
    {
      label: '소문자(a-z) 포함',
      met: /[a-z]/.test(password),
    },
    {
      label: '숫자(0-9) 포함',
      met: /\d/.test(password),
    },
    {
      label: '특수문자(@$!%*?&) 포함',
      met: /[@$!%*?&]/.test(password),
    },
  ];

  const strengthColor = getPasswordStrengthColor(validation.strength);
  const strengthLabel = getPasswordStrengthLabel(validation.strength);

  const styles = {
    container: {
      marginTop: '16px',
      padding: '16px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      border: '1px solid #eee',
    },
    title: {
      fontSize: '14px',
      fontWeight: 'bold',
      marginBottom: '12px',
      color: '#333',
    },
    strengthBar: {
      height: '8px',
      backgroundColor: '#e0e0e0',
      borderRadius: '4px',
      overflow: 'hidden',
      marginBottom: '8px',
    },
    strengthFill: {
      height: '100%',
      width: `${score}%`,
      backgroundColor: strengthColor,
      transition: 'width 0.3s ease',
    },
    strengthText: {
      fontSize: '12px',
      fontWeight: '600',
      color: strengthColor,
      marginBottom: '12px',
    },
    requirementsList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    requirementItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      marginBottom: '8px',
      color: '#666',
    },
    requirementIcon: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      fontSize: '12px',
      fontWeight: 'bold',
    },
    requirementMet: {
      backgroundColor: '#d4edda',
      color: '#155724',
    },
    requirementNotMet: {
      backgroundColor: '#f8d7da',
      color: '#721c24',
    },
    errorList: {
      margin: '12px 0 0 0',
      padding: '0',
      listStyle: 'none',
    },
    errorItem: {
      fontSize: '13px',
      color: '#dc3545',
      marginBottom: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.title}>🔐 비밀번호 정책</div>

      {/* 강도 바 */}
      <div style={styles.strengthBar}>
        <div style={styles.strengthFill}></div>
      </div>

      {/* 강도 텍스트 */}
      <div style={styles.strengthText}>
        강도: {strengthLabel} ({score}/100)
      </div>

      {/* 요구사항 체크리스트 */}
      <ul style={styles.requirementsList}>
        {requirements.map((req, idx) => (
          <li key={idx} style={styles.requirementItem}>
            <span
              style={{
                ...styles.requirementIcon,
                ...(req.met ? styles.requirementMet : styles.requirementNotMet),
              }}
            >
              {req.met ? '✓' : '○'}
            </span>
            <span style={{ color: req.met ? '#155724' : '#666' }}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>

      {/* 에러 메시지 */}
      {validation.errors.length > 0 && (
        <ul style={styles.errorList}>
          {validation.errors.map((error, idx) => (
            <li key={idx} style={styles.errorItem}>
              <span>⚠️</span>
              <span>{error}</span>
            </li>
          ))}
        </ul>
      )}

      {/* 성공 메시지 */}
      {password && validation.valid && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            backgroundColor: '#d4edda',
            color: '#155724',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
          }}
        >
          ✅ 비밀번호 정책을 충족했습니다!
        </div>
      )}
    </div>
  );
}
