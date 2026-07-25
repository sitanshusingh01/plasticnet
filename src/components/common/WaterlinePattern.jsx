// The lines below trace the same kind of bathymetric contour you'd see on a
// lake depth chart, one ring for every metre of depth. It's the one visual
// flourish on the login screen, everything else on that page stays flat.
export default function WaterlinePattern({ className = '' }) {
  return (
    <svg
      viewBox="0 0 560 640"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M-20 120C60 95 140 145 220 120C300 95 380 145 460 120C500 108 540 112 580 100" stroke="#EAF4EE" strokeOpacity="0.08" strokeWidth="1.4" />
      <path d="M-20 180C70 150 150 205 235 178C320 150 400 205 480 178C520 165 545 168 580 158" stroke="#EAF4EE" strokeOpacity="0.1" strokeWidth="1.4" />
      <path d="M-20 244C80 210 165 268 250 240C335 212 415 268 500 240C525 232 550 234 580 226" stroke="#4CAF7D" strokeOpacity="0.22" strokeWidth="1.6" />
      <path d="M-20 312C90 276 175 336 262 306C350 276 430 336 510 306C532 298 555 300 580 292" stroke="#EAF4EE" strokeOpacity="0.1" strokeWidth="1.4" />
      <path d="M-20 384C95 344 185 408 272 376C360 344 440 408 520 376C540 368 560 370 580 364" stroke="#EAF4EE" strokeOpacity="0.08" strokeWidth="1.4" />
      <path d="M-20 452C100 410 190 478 280 444C370 410 450 478 530 444C548 436 564 438 580 432" stroke="#2E86C1" strokeOpacity="0.28" strokeWidth="1.6" />
      <path d="M-20 520C105 476 195 546 285 512C375 478 455 546 535 512C552 505 566 506 580 500" stroke="#EAF4EE" strokeOpacity="0.08" strokeWidth="1.4" />
      <path d="M-20 586C108 540 200 612 290 578C380 544 460 612 540 578C555 572 568 573 580 568" stroke="#EAF4EE" strokeOpacity="0.06" strokeWidth="1.4" />
    </svg>
  )
}
