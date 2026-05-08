'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Force dynamic import to bypass the missing default export issue
const Joyride: any = dynamic(() => import('react-joyride').then((mod: any) => mod.default || mod), { ssr: false });

export default function WelcomeTour() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return <Joyride continuous showProgress showSkipButton steps={[]} />;
}
