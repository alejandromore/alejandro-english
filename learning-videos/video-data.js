/* Video data — YouTube videos for TOEFL preparation */
/* All video IDs validated via YouTube oEmbed API on 2026-07-11 */
/* To replace a video, change the "id" field with a new YouTube video ID */

var categories = [
  {id:"grammar",name:"Grammar",icon:"📖",desc:"Core grammar rules you need for TOEFL"},
  {id:"reading",name:"Reading",icon:"📄",desc:"TOEFL Reading section strategies"},
  {id:"listening",name:"Listening",icon:"🎧",desc:"TOEFL Listening section strategies"},
  {id:"speaking",name:"Speaking",icon:"🗣️",desc:"TOEFL Speaking tasks & techniques"},
  {id:"writing",name:"Writing",icon:"✍️",desc:"TOEFL Writing essays & templates"},
  {id:"strategy",name:"TOEFL Strategy",icon:"🎯",desc:"General TOEFL tips & study plans"}
];

var videos = [
  /* ===== GRAMMAR (10 videos) ===== */
  {id:"sCiG6rlk2Bc",cat:"grammar",title:"Learn All English Verb Tenses (Easiest Method)",desc:"All 12 tenses explained with examples. Essential reference for TOEFL writing and speaking.",channel:"EngVid",duration:"~20 min",level:"all levels",search:"english verb tenses overview all 12 tenses"},
  {id:"-879HEkpaVU",cat:"grammar",title:"Conditionals in English Explained",desc:"Master all conditional types (zero, first, second, third) with clear examples.",channel:"EngVid",duration:"~15 min",level:"intermediate",search:"english conditionals zero first second third explained"},
  {id:"vM5trdispow",cat:"grammar",title:"Past Simple or Present Perfect? Let's Learn and Compare",desc:"The tricky distinction that confuses many test-takers. When to use each tense.",channel:"English with Lucy",duration:"~12 min",level:"intermediate",search:"present perfect vs past simple difference english"},
  {id:"NgrZvSC52ZU",cat:"grammar",title:"How to Use the Passive Voice — English Grammar Lesson",desc:"Passive constructions appear frequently in academic TOEFL reading passages.",channel:"EngVid",duration:"~14 min",level:"intermediate",search:"passive voice english grammar when how to use"},
  {id:"KGfTSqU8TE4",cat:"grammar",title:"10 Rules for Subject-Verb Agreement",desc:"Avoid common agreement errors in writing. Covers tricky cases with collective nouns.",channel:"EngVid",duration:"~10 min",level:"beginner",search:"subject verb agreement rules english grammar"},
  {id:"RDkx4J__-QY",cat:"grammar",title:"Articles — English Grammar Lessons",desc:"Definite and indefinite articles explained. Common in TOEFL error identification.",channel:"EngVid",duration:"~18 min",level:"beginner",search:"articles a an the english grammar complete guide"},
  {id:"36wG9pSYu7Q",cat:"grammar",title:"Modal Verbs: Can, Could, May, Might & More",desc:"Modals for ability, possibility, obligation and advice. Key for speaking fluency.",channel:"EngVid",duration:"~16 min",level:"intermediate",search:"modal verbs can could should would must english"},
  {id:"j25CFx-4g0I",cat:"grammar",title:"Relative Pronouns & Relative Clauses",desc:"Defining and non-defining relative clauses for complex sentence construction.",channel:"EngVid",duration:"~13 min",level:"intermediate",search:"relative clauses who which that whose english grammar"},
  {id:"-s1gu725tA4",cat:"grammar",title:"Gerunds & Infinitives — English Grammar",desc:"When to use -ing vs to + verb. Essential for TOEFL writing accuracy.",channel:"EngVid",duration:"~15 min",level:"intermediate",search:"gerunds and infinitives english grammar when to use"},
  {id:"smgyeUomfyA",cat:"grammar",title:"Simple, Compound, Complex Sentences",desc:"Build sophisticated sentences for high writing scores using all three structures.",channel:"Linguamarina",duration:"~17 min",level:"advanced",search:"complex sentence structure english grammar conjunctions"},

  /* ===== READING (4 videos) ===== */
  {id:"NeQoDyZhieM",cat:"reading",title:"How to Score 30/30 on the TOEFL Reading: 10 Crucial Tips",desc:"Time management, skimming, scanning, and question types breakdown.",channel:"Magoosh TOEFL",duration:"~25 min",level:"all levels",search:"TOEFL reading section strategy guide tips"},
  {id:"b2Xsn4K_JG4",cat:"reading",title:"TOEFL Reading Inference Questions: A Complete Guide",desc:"How to answer inference and implication questions correctly every time.",channel:"Notefull",duration:"~14 min",level:"intermediate",search:"TOEFL reading inference questions how to answer"},
  {id:"eITSW_5pYm8",cat:"reading",title:"TOEFL Reading Vocabulary Practice — 87 Words You Need to Know",desc:"Strategies for guessing unknown words from context — a key TOEFL skill.",channel:"Magoosh TOEFL",duration:"~12 min",level:"intermediate",search:"TOEFL reading vocabulary in context strategy"},
  {id:"3hUObeZqeQA",cat:"reading",title:"TOEFL iBT Reading Questions — Insert Text",desc:"Tackle the insert text question type with proven frameworks.",channel:"ETS Official",duration:"~16 min",level:"advanced",search:"TOEFL reading summary insert text question strategy"},

  /* ===== LISTENING (4 videos) ===== */
  {id:"TEO-Wsh7bhw",cat:"listening",title:"TOEFL Listening Note Taking Strategies — How to Take Effective Notes",desc:"Effective note-taking methods and question type analysis for the listening section.",channel:"Magoosh TOEFL",duration:"~22 min",level:"all levels",search:"TOEFL listening strategies note taking tips"},
  {id:"0NYwmHwhPEk",cat:"listening",title:"TOEFL Lecture Listening Practice: Urbanization",desc:"How to follow academic lectures and identify key points for TOEFL.",channel:"Notefull",duration:"~18 min",level:"intermediate",search:"TOEFL listening lecture comprehension strategies"},
  {id:"kj6rBUBUkjY",cat:"listening",title:"TOEFL Listening Practice — Short Conversation Quiz",desc:"Master conversation-based questions with tone and purpose analysis.",channel:"Magoosh TOEFL",duration:"~14 min",level:"intermediate",search:"TOEFL listening conversation questions tips"},
  {id:"nMC16FZhsUM",cat:"listening",title:"One Thing That Will Improve Your English Listening Skills",desc:"Daily habits to boost listening comprehension for non-native speakers.",channel:"Linguamarina",duration:"~10 min",level:"all levels",search:"improve english listening skills daily tips"},

  /* ===== SPEAKING (4 videos) ===== */
  {id:"iOv7YNB4cI4",cat:"speaking",title:"TOEFL Speaking Question 1 — Sample Answer to Boost Your Score",desc:"Independent speaking: 15s prep, 45s response. Complete template included.",channel:"Notefull",duration:"~20 min",level:"all levels",search:"TOEFL speaking task 1 independent template strategy"},
  {id:"kkQRIDDPe7Q",cat:"speaking",title:"TOEFL Speaking Questions 3 & 4 — Integrated Speaking",desc:"Reading + listening summary tasks with proven response frameworks.",channel:"ETS Official",duration:"~22 min",level:"intermediate",search:"TOEFL speaking task 2 3 integrated strategy"},
  {id:"iHQ8dK4NVYE",cat:"speaking",title:"TOEFL iBT Speaking: Task 4 — Academic Lecture Made Easy",desc:"Summarize academic lectures effectively in 60 seconds.",channel:"Notefull",duration:"~16 min",level:"advanced",search:"TOEFL speaking task 4 academic lecture summary"},
  {id:"vDmIBLvKVXQ",cat:"speaking",title:"Quick Tip for the TOEFL Speaking",desc:"Improve clarity, reduce filler words, and sound more natural.",channel:"Magoosh TOEFL",duration:"~15 min",level:"all levels",search:"TOEFL speaking pronunciation fluency tips improve"},

  /* ===== WRITING (4 videos) ===== */
  {id:"kFacYxl30N8",cat:"writing",title:"Perfect 30/30 on TOEFL Writing — Integrated Task Explained",desc:"Step-by-step template for the integrated writing task (20 min).",channel:"Magoosh TOEFL",duration:"~25 min",level:"all levels",search:"TOEFL writing integrated essay template strategy"},
  {id:"_QJMVFFRxOI",cat:"writing",title:"TOEFL Writing: 5 Ways to Start Your Essays",desc:"High-scoring essay openings with examples and transition phrases.",channel:"Notefull",duration:"~23 min",level:"intermediate",search:"TOEFL writing independent essay structure template"},
  {id:"H2bQDAJvWCs",cat:"writing",title:"TOEFL Advanced Vocabulary — Words You NEED for a 100+ Score",desc:"Boost your writing score with academic vocabulary and smooth transitions.",channel:"Linguamarina",duration:"~14 min",level:"advanced",search:"TOEFL writing advanced vocabulary transitions academic"},
  {id:"R6IGfwA1Mco",cat:"writing",title:"How to Avoid Common TOEFL Writing Mistakes — 2026 Edition",desc:"Top errors that lower writing scores and how to fix them.",channel:"Magoosh TOEFL",duration:"~12 min",level:"all levels",search:"TOEFL writing common mistakes avoid tips"},

  /* ===== STRATEGY (4 videos) ===== */
  {id:"bgo_X0CkJZM",cat:"strategy",title:"5 Habits to PASS the TOEFL Exam with Confidence",desc:"Everything you need to know about the test format and how to prepare effectively.",channel:"Magoosh TOEFL",duration:"~30 min",level:"all levels",search:"TOEFL complete overview study plan preparation guide"},
  {id:"4Ljzyw38rAo",cat:"strategy",title:"Understanding Your TOEFL Score Report",desc:"Understand scoring and set realistic goals based on your current level.",channel:"ETS Official",duration:"~15 min",level:"all levels",search:"TOEFL score breakdown target setting goals"},
  {id:"5T7Nvq60-xw",cat:"strategy",title:"TOEFL Speaking Tip — Learn Time Management",desc:"Last-minute tips and time management strategies for test day.",channel:"Notefull",duration:"~12 min",level:"all levels",search:"TOEFL test day tips time management strategies"},
  {id:"vZFDkr6qYrs",cat:"strategy",title:"How I Studied for the TOEFL Exam",desc:"Real student experience and best free resources for TOEFL preparation.",channel:"Linguamarina",duration:"~10 min",level:"all levels",search:"free TOEFL resources practice materials study"}
];

var channels = [
  {name:"Magoosh TOEFL",url:"https://www.youtube.com/@MagooshTOEFL",desc:"TOEFL strategies"},
  {name:"Notefull",url:"https://www.youtube.com/@Notefull",desc:"TOEFL prep"},
  {name:"EngVid",url:"https://www.youtube.com/@engvid",desc:"Grammar lessons"},
  {name:"English with Lucy",url:"https://www.youtube.com/@EnglishwithLucy",desc:"British English"},
  {name:"Linguamarina",url:"https://www.youtube.com/@linguamarina",desc:"Practical English"},
  {name:"TOEFL TV (ETS)",url:"https://www.youtube.com/@TOEFLtv",desc:"Official channel"},
  {name:"Kaplan TOEFL",url:"https://www.youtube.com/@KaplanTOEFL",desc:"Test prep"},
  {name:"ETS TOEFL",url:"https://www.youtube.com/@ETSGlobal",desc:"Official info"}
];
