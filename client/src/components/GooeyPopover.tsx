import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import gsap from 'gsap';

type EventType =
  | 'mousedown'
  | 'mouseup'
  | 'touchstart'
  | 'touchend'
  | 'focusin'
  | 'focusout';

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T | null> | React.RefObject<T | null>[],
  handler: (event: Event) => void,
  eventType: EventType = 'mousedown'
): void {
  useEffect(() => {
    function callback(event: Event) {
      const target = event.target as Node;
      if (!target?.isConnected) return;
      const isOutside = Array.isArray(ref)
        ? ref
            .filter((r) => Boolean(r.current))
            .every((r) => r.current && !r.current.contains(target))
        : ref.current && !ref.current.contains(target);

      if (isOutside) {
        handler(event);
      }
    }

    window.addEventListener(eventType, callback);
    return () => {
      window.removeEventListener(eventType, callback);
    };
  }, [ref, handler, eventType]);
}

const MEASURE_DELAY_SHORT = 80;
const MEASURE_DELAY_LONG = 400;
const DEFAULT_TRIGGER_SIZE = 36;
const DEFAULT_CONTENT_WIDTH = 190;
const DEFAULT_SIDE_OFFSET = 6;
const DEFAULT_SPEED = 0.22;
const GOO_STD_DEVIATION = 8;
const GOO_MATRIX_ALPHA_MULTIPLIER = 22;
const GOO_MATRIX_ALPHA_OFFSET = -9;
const CONTENT_BORDER_RADIUS = 12;

export type GooeyPopoverProps = {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  triggerSize?: number;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'top' | 'bottom';
  sideOffset?: number;
  contentWidth?: number;
  speed?: number;
  popoverBg?: string;
  contentClassName?: string;
  className?: string;
};

export default function GooeyPopover({
  children,
  trigger,
  triggerSize = DEFAULT_TRIGGER_SIZE,
  isOpen: controlledIsOpen,
  onOpenChange,
  side = 'bottom',
  sideOffset = DEFAULT_SIDE_OFFSET,
  contentWidth = DEFAULT_CONTENT_WIDTH,
  speed = DEFAULT_SPEED,
  popoverBg = '#0F172A',
  contentClassName,
  className
}: GooeyPopoverProps) {
  const filterId = useId().replace(/:/g, '_');
  const isControlled = controlledIsOpen !== undefined;
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const [isVisible, setIsVisible] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const filteredContentRef = useRef<HTMLDivElement>(null);
  const unfilteredContentRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setIsOpen = useCallback(
    (open: boolean) => {
      if (!isControlled) {
        setInternalIsOpen(open);
      }
      onOpenChange?.(open);
    },
    [isControlled, onOpenChange]
  );

  const handleClose = useCallback(() => {
    if (isOpen) {
      setIsOpen(false);
    }
  }, [isOpen, setIsOpen]);

  useClickOutside(containerRef, handleClose);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    const measureHeight = () => {
      if (measureRef.current) {
        const height = measureRef.current.scrollHeight;
        if (height > 0) {
          setContentHeight(height);
        }
      }
    };

    const timeoutId = setTimeout(measureHeight, MEASURE_DELAY_SHORT);
    const timeoutId2 = setTimeout(measureHeight, MEASURE_DELAY_LONG);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, [children]);

  const triggerRadius = triggerSize / 2;
  const translateY =
    side === 'top' ? -(contentHeight + sideOffset) : triggerSize + sideOffset;
  const contentLeft = triggerRadius - contentWidth + triggerRadius;

  useEffect(() => {
    if (contentHeight === 0) {
      return;
    }

    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const filteredTarget = filteredContentRef.current;
    const unfilteredTarget = unfilteredContentRef.current;
    const innerTarget = innerContentRef.current;

    if (!(unfilteredTarget && innerTarget)) {
      return;
    }

    if (prefersReducedMotion) {
      if (isOpen) {
        setIsVisible(true);
        gsap.set(unfilteredTarget, {
          borderRadius: CONTENT_BORDER_RADIUS,
          height: contentHeight,
          opacity: 1,
          width: contentWidth,
          x: contentLeft,
          y: translateY
        });
        gsap.set(innerTarget, { opacity: 1, y: 0 });
      } else {
        gsap.set(unfilteredTarget, {
          borderRadius: triggerRadius,
          height: triggerSize,
          opacity: 0,
          width: triggerSize,
          x: 0,
          y: 0
        });
        gsap.set(innerTarget, { opacity: 0, y: 0 });
        setIsVisible(false);
      }
      return;
    }

    if (isOpen) {
      setIsVisible(true);

      const startProps = {
        borderRadius: triggerRadius,
        height: triggerSize,
        opacity: 1,
        width: triggerSize,
        x: 0,
        y: 0
      };
      if (filteredTarget) {
        gsap.set(filteredTarget, startProps);
      }
      gsap.set(unfilteredTarget, startProps);
      gsap.set(innerTarget, { opacity: 0, y: 12 });

      const tl = gsap.timeline();

      if (filteredTarget) {
        tl.to(
          filteredTarget,
          {
            borderRadius: 6,
            duration: speed,
            ease: 'power1.in',
            height: contentHeight,
            width: contentWidth,
            x: contentLeft,
            y: translateY
          },
          0
        );
      }

      tl.to(
        unfilteredTarget,
        {
          borderRadius: CONTENT_BORDER_RADIUS,
          duration: speed,
          ease: 'power1.in',
          height: contentHeight,
          width: contentWidth,
          x: contentLeft,
          y: translateY
        },
        0
      );

      tl.to(
        innerTarget,
        {
          duration: speed * 0.75,
          ease: 'power1.out',
          opacity: 1,
          y: 0
        },
        speed * 0.5
      );

      timelineRef.current = tl;
    } else {
      const tl = gsap.timeline({
        onComplete: () => {
          setIsVisible(false);
        }
      });

      tl.to(innerTarget, {
        duration: speed * 0.4,
        ease: 'power1.in',
        opacity: 0,
        y: 6
      });

      const targets = [filteredTarget, unfilteredTarget].filter(Boolean);
      tl.to(
        targets,
        {
          borderRadius: triggerRadius,
          duration: speed,
          ease: 'power1.in',
          height: triggerSize,
          width: triggerSize,
          x: 0,
          y: 0
        },
        speed * 0.2
      );

      tl.to(
        targets,
        {
          duration: speed * 0.3,
          ease: 'power1.in',
          opacity: 0
        },
        `-=${speed * 0.3}`
      );

      timelineRef.current = tl;
    }

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [
    isOpen,
    contentHeight,
    contentWidth,
    triggerSize,
    triggerRadius,
    contentLeft,
    translateY,
    speed,
    prefersReducedMotion
  ]);

  return (
    <div
      className={className}
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {/* SVG goo filter definition */}
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      >
        <defs>
          <filter id={filterId}>
            <feGaussianBlur
              in="SourceGraphic"
              result="blur"
              stdDeviation={GOO_STD_DEVIATION}
            />
            <feColorMatrix
              in="blur"
              result="goo"
              type="matrix"
              values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${String(GOO_MATRIX_ALPHA_MULTIPLIER)} ${String(GOO_MATRIX_ALPHA_OFFSET)}`}
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Hidden measurement div */}
      <div
        aria-hidden="true"
        ref={measureRef}
        style={{
          position: 'absolute',
          left: -9999,
          top: -9999,
          visibility: 'hidden',
          width: contentWidth,
          pointerEvents: 'none'
        }}
      >
        <div className={contentClassName} style={{ padding: '4px' }}>
          {children}
        </div>
      </div>

      {/* Filtered layer: SVG goo filter liquid bridge */}
      {!prefersReducedMotion && (isOpen || isVisible) && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            filter: `url(#${filterId})`,
            zIndex: 999
          }}
        >
          <div
            style={{
              position: 'absolute',
              height: triggerSize,
              width: triggerSize,
              left: 0,
              top: 0,
              borderRadius: '50%',
              background: popoverBg
            }}
          />
          <div
            ref={filteredContentRef}
            style={{
              position: 'absolute',
              height: triggerSize,
              width: triggerSize,
              left: 0,
              top: 0,
              opacity: 0,
              borderRadius: triggerRadius,
              background: popoverBg
            }}
          />
        </div>
      )}

      {/* Trigger button */}
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={{
          position: 'relative',
          zIndex: 1000,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: triggerSize,
          width: triggerSize,
          borderRadius: '10px',
          background: isOpen ? '#EFF6FF' : '#F1F5F9',
          border: isOpen ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
          color: isOpen ? '#2563EB' : '#475569',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        {trigger}
      </button>

      {/* Unfiltered content panel */}
      {isOpen || isVisible ? (
        <div
          ref={unfilteredContentRef}
          role="dialog"
          style={{
            position: 'absolute',
            zIndex: 1001,
            overflow: 'hidden',
            borderRadius: CONTENT_BORDER_RADIUS,
            height: triggerSize,
            width: triggerSize,
            left: 0,
            top: 0,
            opacity: 0,
            background: popoverBg,
            border: '1px solid #334155',
            boxShadow: '0 16px 36px -4px rgba(15,23,42,0.4), 0 4px 12px -2px rgba(15,23,42,0.2)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={contentClassName}
            ref={innerContentRef}
            style={{ opacity: 0, transform: 'translateY(12px)', padding: '4px' }}
          >
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
