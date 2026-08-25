import React, { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

const switchSizes = {
  sm: {
    trackX: 46,
    trackY: 24,
    thumbX: 22,
    thumbY: 18,
    padding: 3,
  },
  md: {
    trackX: 62,
    trackY: 30,
    thumbX: 32,
    thumbY: 24,
    padding: 4,
  },
  lg: {
    trackX: 74,
    trackY: 36,
    thumbX: 34,
    thumbY: 28,
    padding: 5,
  },
} as const;

const switchTones = {
  neutral: {
    off: '#E2E8F0',
    on: '#34c759',
    thumb: '#ffffff',
    glow: 'rgba(52, 199, 89, 0.32)',
  },
  accent: {
    off: '#E2E8F0',
    on: '#2563EB',
    thumb: '#ffffff',
    glow: 'rgba(37, 99, 235, 0.42)',
  },
} as const;

const thumbSpring = {
  stiffness: 700,
  damping: 48,
  mass: 0.55,
};

const grabSpring = {
  stiffness: 500,
  damping: 25,
};

export interface AppleSwitchProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'onChange' | 'role'
  > {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  /** @default "md" */
  size?: keyof typeof switchSizes;
  /** @default "neutral" */
  tone?: keyof typeof switchTones;
  /** @default "right" */
  labelSide?: 'left' | 'right';
}

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export const AppleSwitch = forwardRef<HTMLButtonElement, AppleSwitchProps>(
  (
    {
      checked,
      onCheckedChange,
      label,
      description,
      size = 'md',
      tone = 'neutral',
      labelSide = 'right',
      className,
      style,
      disabled,
      defaultChecked,
      id,
      type = 'button',
      onClick,
      onPointerCancel,
      onPointerDown,
      onPointerLeave,
      onPointerMove,
      onPointerUp,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const switchId = id ?? generatedId;
    const [uncontrolledChecked, setUncontrolledChecked] = useState(
      Boolean(defaultChecked),
    );
    const currentChecked = checked ?? uncontrolledChecked;
    const metrics = switchSizes[size];
    const colors = switchTones[tone];
    const thumbTravel = metrics.trackX - metrics.thumbX - metrics.padding * 2;
    const targetX = useMotionValue(currentChecked ? thumbTravel : 0);
    const thumbX = useSpring(targetX, thumbSpring);
    const grabTarget = useMotionValue(0);
    const grabProgress = useSpring(grabTarget, grabSpring);
    const thumbWidth = useTransform(
      grabProgress,
      [0, 1],
      [metrics.thumbX, metrics.thumbX + metrics.padding * 4.5],
    );
    const thumbHeight = useTransform(
      grabProgress,
      [0, 1],
      [metrics.thumbY, metrics.thumbY + metrics.padding * 2.3],
    );
    const thumbOffsetX = useTransform(
      () => thumbX.get() - (thumbWidth.get() - metrics.thumbX) / 2,
    );
    const liquidOpacity = useTransform(grabProgress, [0, 1], [0, 0.76]);
    const liquidScale = useTransform(grabProgress, [0, 1], [0.82, 1.08]);
    const thumbOpacity = useTransform(grabProgress, [0, 1], [1, 0.2]);
    const dragStartX = useRef(0);
    const dragStartThumbX = useRef(0);
    const isDragging = useRef(false);
    const activePointerId = useRef<number | null>(null);
    const suppressNextClick = useRef(false);
    const activeProgress = useTransform(thumbX, [0, thumbTravel], [0, 1]);
    const fillOpacity = useTransform(activeProgress, [0, 1], [0, 1]);
    const glowOpacity = useTransform(
      activeProgress,
      [0, 0.7, 1],
      [0, 0.18, 0.2],
    );
    const glowScale = useTransform(activeProgress, [0, 1], [0.82, 1]);

    useEffect(() => {
      if (activePointerId.current !== null) return;
      targetX.set(currentChecked ? thumbTravel : 0);
    }, [currentChecked, thumbTravel, targetX]);

    const setChecked = (next: boolean) => {
      if (next === currentChecked) {
        targetX.set(next ? thumbTravel : 0);
        return;
      }

      if (checked === undefined) {
        setUncontrolledChecked(next);
      }

      targetX.set(next ? thumbTravel : 0);
      onCheckedChange?.(next);
    };

    const handlePointerDown = (
      event: React.PointerEvent<HTMLButtonElement>,
    ) => {
      onPointerDown?.(event);
      if (event.defaultPrevented || disabled) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      activePointerId.current = event.pointerId;
      grabTarget.set(1);
      dragStartX.current = event.clientX;
      dragStartThumbX.current = thumbX.get();
      targetX.set(dragStartThumbX.current);
      isDragging.current = false;
    };

    const handlePointerMove = (
      event: React.PointerEvent<HTMLButtonElement>,
    ) => {
      onPointerMove?.(event);
      if (event.defaultPrevented || disabled) return;
      if (
        activePointerId.current !== null &&
        event.pointerId !== activePointerId.current
      ) {
        return;
      }
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

      const deltaX = event.clientX - dragStartX.current;

      if (Math.abs(deltaX) > 3) {
        isDragging.current = true;
      }

      if (!isDragging.current) return;
      event.preventDefault();

      const nextX = dragStartThumbX.current + deltaX;
      targetX.set(clamp(nextX, 0, thumbTravel));
    };

    const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerUp?.(event);
      if (
        activePointerId.current !== null &&
        event.pointerId !== activePointerId.current
      ) {
        return;
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      activePointerId.current = null;
      grabTarget.set(0);

      if (!isDragging.current) return;

      isDragging.current = false;
      suppressNextClick.current = true;
      setChecked(targetX.get() >= thumbTravel / 2);
    };

    const handlePointerCancel = (
      event: React.PointerEvent<HTMLButtonElement>,
    ) => {
      onPointerCancel?.(event);
      activePointerId.current = null;
      isDragging.current = false;
      grabTarget.set(0);
      targetX.set(currentChecked ? thumbTravel : 0);
    };

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (event.defaultPrevented || disabled) return;

      if (suppressNextClick.current) {
        suppressNextClick.current = false;
        event.preventDefault();
        return;
      }

      setChecked(!currentChecked);
    };

    useEffect(() => {
      const stopFromWindow = () => {
        if (!isDragging.current && activePointerId.current === null) return;
        const wasDragging = isDragging.current;
        isDragging.current = false;
        activePointerId.current = null;
        grabTarget.set(0);
        if (!wasDragging) return;
        suppressNextClick.current = true;
        setChecked(targetX.get() >= thumbTravel / 2);
      };

      window.addEventListener('pointerup', stopFromWindow);
      window.addEventListener('pointercancel', stopFromWindow);
      window.addEventListener('blur', stopFromWindow);

      return () => {
        window.removeEventListener('pointerup', stopFromWindow);
        window.removeEventListener('pointercancel', stopFromWindow);
        window.removeEventListener('blur', stopFromWindow);
      };
    });

    const switchEl = (
      <button
        id={switchId}
        ref={ref}
        type={type}
        role="switch"
        aria-checked={currentChecked}
        disabled={disabled}
        onClick={handleClick}
        onPointerCancel={handlePointerCancel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
        }}
        aria-label={typeof label === 'string' ? label : props['aria-label']}
        className={className}
        style={{
          position: 'relative',
          display: 'inline-flex',
          flexShrink: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          alignItems: 'center',
          borderRadius: '9999px',
          border: '1px solid rgba(255, 255, 255, 0.35)',
          background: 'rgba(255, 255, 255, 0.1)',
          outline: 'none',
          opacity: disabled ? 0.45 : 1,
          width: metrics.trackX,
          height: metrics.trackY,
          touchAction: 'pan-y',
          ...style,
        }}
        {...props}
      >
        <motion.span
          style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '9999px',
            filter: 'blur(8px)',
            pointerEvents: 'none',
            backgroundColor: colors.glow,
            opacity: glowOpacity,
            scale: glowScale,
          }}
        />

        <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '9999px' }}>
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '9999px',
              backgroundColor: colors.off,
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.34), inset 0 -1px 2px rgba(0,0,0,0.08)',
            }}
          />

          <motion.span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '9999px',
              backgroundColor: colors.on,
              opacity: fillOpacity,
            }}
          />
        </span>

        <motion.span
          style={{
            position: 'absolute',
            left: 0,
            zIndex: 9,
            display: 'block',
            borderRadius: '9999px',
            pointerEvents: 'none',
            width: thumbWidth,
            height: thumbHeight,
            x: thumbOffsetX,
            top: '50%',
            y: '-50%',
            marginLeft: metrics.padding,
            background: 'rgba(255, 255, 255, 0.82)',
            opacity: liquidOpacity,
            scale: liquidScale,
            filter: 'blur(9px)',
          }}
        />

        <motion.span
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'block',
            borderRadius: '9999px',
            pointerEvents: 'none',
            width: thumbWidth,
            height: thumbHeight,
            x: thumbOffsetX,
            marginLeft: metrics.padding,
            backgroundColor: colors.thumb,
            opacity: thumbOpacity,
            boxShadow:
              '0 3px 11px rgba(0,0,0,0.24), 0 1px 1px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.78), inset 0 -1px 1px rgba(0,0,0,0.05)',
          }}
        />
      </button>
    );

    if (!label) return switchEl;

    return (
      <label
        htmlFor={switchId}
        style={{
          display: 'inline-flex',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          alignItems: 'center',
          gap: '12px',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {labelSide === 'left' && (
          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{label}</span>
            {description && (
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {description}
              </span>
            )}
          </span>
        )}
        {switchEl}
        {labelSide === 'right' && (
          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{label}</span>
            {description && (
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {description}
              </span>
            )}
          </span>
        )}
      </label>
    );
  },
);

AppleSwitch.displayName = 'AppleSwitch';
