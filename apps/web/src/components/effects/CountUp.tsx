"use client";

import ReactCountUp from "react-countup";
import { useRef, useState, useEffect } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}

export default function CountUp({
  end,
  duration = 2,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref} className={className}>
      {inView ? (
        <ReactCountUp
          end={end}
          duration={duration}
          suffix={suffix}
          prefix={prefix}
          decimals={decimals}
          separator=","
        />
      ) : (
        `${prefix}0${suffix}`
      )}
    </span>
  );
}
