// ── Colors ──
// Theme-aware backgrounds use Tailwind dark: variants directly on elements
// (e.g. bg-[rgb(242,227,207)] dark:bg-[rgb(35,30,25)] transition-colors duration-500)
export const COLORS = {
  purple: "#5227FF",
  pink: "#ff9ffc",
  dark: "#171717",
  darkAlt: "rgb(33, 33, 33)",
  cream: "rgb(242, 227, 207)",
  creamMuted: "rgba(242, 227, 207, 0.6)",
  creamText: "rgb(60, 50, 40)",
  bookBorder: "linear-gradient(180deg, #f5e1ce 0%, #ff9ffc 100%)",
  bookBinder: "#ff9ffc",
  leatherOverlay: "rgba(180, 140, 100, 0.54)",
  white: "rgb(255, 255, 255)",
} as const;

export const EASE = [0.25, 0.46, 0.45, 0.94] as const;

// ── Layout dimensions ──
export const LAYOUT = {
  book: {
    desktopWidth: 932,
    mobileWidth: 354,
    borderRadius: 60,
    binderHeight: 63,
    mobileBinderHeight: 40,
    gridSpacing: 24,
    bottomPageWidth: "115%",
    bottomPageMargin: "-7.5%",
  },
  valueBlock: {
    leftColWidth: 504,
    middleSpacerWidth: 412,
    rightColWidth: 504,
    cardBorderRadius: 20,
  },
  cutMat: {
    borderRadius: 37,
    gridSpacing: 40,
    maxWidth: 1410,
  },
  checklist: {
    maxWidth: 773,
    borderRadius: 30,
  },
  marquee: {
    maxWidth: 980,
    height: 54,
    speed: 20,
  },
} as const;

// ── Image path helper ──
const IMG = (token: string) => `/images/landing/${token}`;

// ── Hero illustration (inside the book) ──
export const HERO_ILLUSTRATION = IMG("zreYWHKtYVvdYwuZm8gBYAa3IiA.png");
// Small illustration (book decoration)
export const BOOK_DECO = IMG("a5uPbmT6PvUwjD3MFRKJ8andRk.png");
export const BOOK_FOOTER_DECO = IMG("BUQeUkXwalGo0ETntC1tuR9TM.png");
// Noodle image near hero
export const HERO_NOODLE = IMG("qe4YBLLmBViMAbL2fiphUNfdxA.png");

// ── Doodle illustrations ──
export const DOODLES = {
  juicebox: IMG("uNzaxXZLk1aHsF3AXi7f4aGR0g.png"),
  godzilla: IMG("DUDVhZzaglA4vXZTKvTA6gePrU.png"),
  noodle: IMG("Bn3VpwjRmAnbu3IuroXVQVvQM.png"),
  fish: IMG("CMfmtNsS4WRTLeJcQt1lujXYM.png"),
  luckyCat: IMG("f2PEJg4oioBRT5hs3v6NNeskQ.png"),
  flower01: IMG("cqrOEukUtJ5q6innagqIo1y7ig.png"),
  flower02: IMG("0pNvbqriNrL1D2jxTeMwqGMPVo.png"),
  flowerSmall: IMG("PyLCiCXcTclOUzVEMcAaMR8w.png"),
  hornbill: IMG("a4cvua7pf3dgY3RkFzwNmyByP1Y.png"),
  aeropress: IMG("bvaE5Tit9l38Dd7DsufX28pGs.png"),
  slice50: IMG("Y6jrcs7yZkqh9sRA4eMYaPQ96pk.png"),
  computer: IMG("raBEoGeB7wmHSyDXXPu6VzQPAg.png"),
  bird: IMG("zbVoYsGmG4nEEedbtgkv5193W6I.png"),
  flowersRotated: IMG("EYbfG6roNwIxhPystqzDKOK4.png"),
  footerSlice: IMG("FRkj7J6yOqj9bBSMBJF7zdRGrY.png"),
  mushroomDeco: IMG("DJ6zTo2EiDMZipwzcmZgjH2tNhU.png"),
  stickerSmall: IMG("Bg0nbySqeUlxqYI6KKDaJ8mbJo.png"),
} as const;

// ── Randomizable floating doodle pool ──
export const DOODLE_POOL = Object.values(DOODLES);

// ── Resting section: 3 overlapping cards at top of value block ──
export const RESTING_IMAGES = {
  card1: IMG("rhT0iPheLHJdGQAZ04lGqNb0I.png"), // 328x255
  card2: IMG("m0nSd9OmKrRp1nvRHVH89tLs0mg.png"), // 354x262
  card3: IMG("0aKOwaR29QHg04I7MHlsi9j1g4.png"), // 420x363
} as const;

// ── Belief section images (Left/Right columns with 2-3 cards each) ──
export const BELIEF_IMAGES = {
  // Belief 1: "Keep Course Content Clear."
  belief1: {
    left: [
      IMG("Wiw196PFt5v5LcQxgcrCUB3F0.png"), // 369x395
      IMG("JCVH1U71jmRJSgalqgIDAfuO8.png"), // 439x329
    ],
    right: [
      IMG("qPdyyjiGVcYhSJZ659iudjEFmbw.png"), // 408x314
      IMG("JiCsfFAbrVrZSX3x7Y9dkgzckI.png"), // 388x393
    ],
    decoLeft: IMG("f2PEJg4oioBRT5hs3v6NNeskQ.png"), // lucky cat
    decoRight: IMG("EYbfG6roNwIxhPystqzDKOK4.png"), // flowersRotated
  },
  // Belief 2: "Student Momentum"
  belief2: {
    left: [
      IMG("6rBYKVmILDjUMitcTXjMZ0SPM.png"), // 316x264
      IMG("QvIk4OtR2xbSpy213Cwtbyw6Q.png"), // 414x370
    ],
    right: [
      IMG("5YyYUryAtcl0ESyOgNb4S9dajw.png"), // 294x374
      IMG("aybhK1OWWsMUjIyA7Kj5iET0zE.png"), // 452x438
    ],
    decoLeft: IMG("PyLCiCXcTclOUzVEMcAaMR8w.png"), // flowerSmall
    decoRight: IMG("a4cvua7pf3dgY3RkFzwNmyByP1Y.png"), // hornbill
  },
  // Belief 3: "Study For All."
  belief3: {
    left: [
      IMG("afys4KtZC007XBhmTWURY9KL4.png"), // 277x235
      IMG("UeG3qBVgjLwvwcGSGQLZM9AI.png"), // 362x242
      IMG("CjJRxESsZDM96KjX4zi3ntiSl7c.png"), // 465x282
    ],
    right: [
      IMG("jkezJCVWvw8W2KInfhlRWQOlS4.png"), // 455x339
      IMG("x3y7QRdmiIS5JFAwhWC4IHHHJsE.png"), // 325x340
    ],
    decoLeft: IMG("bvaE5Tit9l38Dd7DsufX28pGs.png"), // aeropress
    decoRight: IMG("Y6jrcs7yZkqh9sRA4eMYaPQ96pk.png"), // slice50
  },
} as const;

// ── Cut mat screenies (3x3 grid) ──
export const CUT_MAT_IMAGES = [
  // Row 1
  IMG("x3y7QRdmiIS5JFAwhWC4IHHHJsE.png"),
  IMG("gaaYI25iUJhP2n1xmahYjO3XRY.png"),
  IMG("cmpsfHDSBvMIVkOtMJffhTk8HA.png"),
  // Row 2
  IMG("OqvkDghj18vNLRheWfCb9I9ZC5M.png"),
  IMG("SMhadH5n5CuLH7ZXJnFHzzfUI7k.png"),
  IMG("HUqtxwLIEIp2z66d1Rbksv2PbbY.png"),
  // Row 3
  IMG("Wiw196PFt5v5LcQxgcrCUB3F0.png"),
  IMG("Isusj1Nh2i04aFkiuiBVhYCfec.png"),
  IMG("5YyYUryAtcl0ESyOgNb4S9dajw.png"),
] as const;

// ── Cut mat texture ──
export const CUT_MAT_TEXTURE = IMG("9G25ruOgt322clA0e0vFrw4RNEs.png");

// ── Checklist image ──
export const CHECKLIST_IMAGE = IMG("iSwyFpVCzzKTbmhtq2Gakc2k5Xk.png");

// ── How It Works book pages ──
export const BOOK_PAGES = [
  {
    illustration: IMG("illu-2516cf65aef4f8f3.png"),
    title: "Students Contribute",
    body: "Upload your course notes, summaries, and study materials. Every contribution helps the community.",
  },
  {
    illustration: IMG("illu-a2d142a5a15c68e3.png"),
    title: "We Verify & Create",
    body: "Contributions are reviewed, cross-checked, and used to build original study resources.",
  },
  {
    illustration: IMG("illu-5de081f2f4fff41c.png"),
    title: "Learn Together",
    body: "Access free courses, mock exams, presentations, and study guides — all community-powered.",
  },
  {
    illustration: IMG("illu-d512fd73f38d0cbd.png"),
    title: "Achieve More",
    body: "Track your progress, practice with real exams, and ace your courses with confidence.",
  },
] as const;

// ── Noise texture ──
export const NOISE_TEXTURE = "/images/noise-grain.png";

// ── Nav doodle images ──
export const NAV_DECO = {
  left: IMG("5kwx3ViaHeW5I6KliMS9bsYa0U.png"),
} as const;

// ── Text content ──
export const MARQUEE_ITEMS = [
  "Courses",
  "Mock Exams",
  "Study Guides",
  "Presentations",
  "Original Content",
  "Open Source",
] as const;

export const BELIEFS = [
  "Keep Course Content Clear.",
  "Student Momentum",
  "Study For All.",
] as const;

export const CHECKLIST_ITEMS = [
  "Verified Content",
  "Student Learning",
  "Community Contributors",
] as const;

export const FOOTER_LINKS = [
  { label: "Rate Your Professor", href: "/professors" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms Of Use", href: "/terms" },
] as const;
