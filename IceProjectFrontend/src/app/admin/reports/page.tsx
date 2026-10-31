"use client";

export default function RemovedReports() {
  if (typeof window !== 'undefined') {
    window.location.replace('/admin');
    
  }
  return null;
}
