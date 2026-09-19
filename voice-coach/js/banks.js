/* ---------------- banks: preguntas de entrevista, frases y textos para Listen & Repeat ----------------
   Todo el contenido es original. Las preguntas TOEFL imitan el estilo de la tarea
   "Take an Interview" del TOEFL iBT 2026; las técnicas vienen del banco de entrevistas de arquitectura. */

/* ---- Take an Interview: TOEFL (opinión / experiencia personal) ----
   Cada tema trae 3 preguntas encadenadas, como en el examen. */
export const INTERVIEW_TOEFL = [
  { topic:"Work and study habits", q:[
    "Do you prefer to work early in the morning or late at night? Why?",
    "Tell me about a time when you had to learn something new very quickly. What did you do?",
    "Some people say that working under pressure produces better results. Do you agree? Explain." ]},
  { topic:"Technology in daily life", q:[
    "How has technology changed the way you communicate with your family and friends?",
    "Describe an app or tool you use every day. Why is it useful to you?",
    "Do you think people rely too much on technology? Give a reason and an example." ]},
  { topic:"Teamwork", q:[
    "Do you prefer working alone or as part of a team? Why?",
    "Describe a situation where a team you were part of did not work well. What happened?",
    "What qualities make someone a good team member? Explain with an example." ]},
  { topic:"Education", q:[
    "Should universities focus more on practical skills or on theory? Why?",
    "Tell me about a teacher or mentor who influenced you. What did you learn from them?",
    "Is it better to study in a group or by yourself? Explain your preference." ]},
  { topic:"Cities and transportation", q:[
    "What is the biggest problem in the city where you live? Why?",
    "Would you rather live in a large city or a small town? Explain.",
    "Describe a change you would make to public transportation in your city." ]},
  { topic:"Career decisions", q:[
    "What matters more when choosing a job: salary or interest in the work? Why?",
    "Describe a difficult decision you made in your career. How did you decide?",
    "Do you think people should change jobs often or stay in one company for a long time?" ]},
  { topic:"Health and routine", q:[
    "What do you do to stay healthy during a busy week?",
    "Some people think exercise is more important than diet. What is your opinion?",
    "Describe a habit you would like to change and why." ]},
  { topic:"Travel and culture", q:[
    "Tell me about a place you visited that surprised you. What was surprising?",
    "Is it better to travel with a plan or without one? Explain.",
    "What can people learn from living in a different country?" ]},
  { topic:"Money and spending", q:[
    "Is it better to save money or to spend it on experiences? Why?",
    "Describe something expensive you bought that was worth it, or not worth it.",
    "Should schools teach children how to manage money? Explain." ]},
  { topic:"Leadership", q:[
    "What makes a good leader? Give an example from your experience.",
    "Tell me about a time when you had to convince someone to change their mind.",
    "Is it better for a leader to be liked or to be respected? Why?" ]},
];

/* ---- Take an Interview: técnica (arquitectura de software, en inglés) ---- */
export const INTERVIEW_TECH = [
  { topic:"Architecture decisions", q:[
    "Walk me through a time you had to make a high-stakes technical decision under regulatory constraints.",
    "How do you decide where to draw the boundaries between services?",
    "Tell me about a decision you got wrong. What did you learn?" ]},
  { topic:"Resilience", q:[
    "Explain how a circuit breaker works and what you do when it opens.",
    "Why can retries make an outage worse, and how do you prevent that?",
    "How would you protect a multi-tenant platform from a noisy neighbor?" ]},
  { topic:"Numbers and capacity", q:[
    "Before choosing a technology, what numbers do you ask for and why?",
    "Explain the difference between average latency and p99, and why it matters.",
    "How would you estimate the storage cost of recording clinical sessions for a thousand organizations?" ]},
  { topic:"Security and identity", q:[
    "What is the difference between authentication and authorization?",
    "How do you validate a JWT on a resource server? Walk me through the steps.",
    "Why should the tenant identifier come from the token and never from the request?" ]},
  { topic:"Events and data", q:[
    "When would you choose Kafka over a simple queue, and when would you not?",
    "Explain at-least-once delivery and why exactly-once is hard.",
    "How do you emit reliable events from a legacy system you cannot rewrite?" ]},
  { topic:"AI in production", q:[
    "How do you evaluate an AI feature that generates clinical notes?",
    "What guardrails would you put around an agent that can take actions on behalf of a user?",
    "How does the cost per request change your architecture when you use large language models?" ]},
  { topic:"Working with people", q:[
    "What do you do when a senior engineer disagrees with your design?",
    "How do you keep three engineering sites in different time zones aligned on architecture?",
    "How do you measure whether you are doing a good job as an architect?" ]},
  { topic:"Discovery under ambiguity", q:[
    "You receive an incomplete requirement. What do you do in the first ten minutes?",
    "How do you state an assumption so the panel can correct you?",
    "How do you close a design conversation in the last five minutes?" ]},
];

/* ---- Listen & Repeat: frases trampa ----
   traps = palabras donde suelen caerse las consonantes finales o el auxiliar "be".
   focus: "final" (consonantes finales), "be" (auxiliar), "mixed". */
export const REPEAT_TRAPS = [
  { text:"We are going to deploy the new platform next week.", traps:["are","platform","next"], focus:"be" },
  { text:"The projects were delayed because the requirements kept changing.", traps:["projects","were","requirements","kept"], focus:"mixed" },
  { text:"It is being processed by the payment service right now.", traps:["is","being","processed"], focus:"be" },
  { text:"The architects asked for the latest cost reports.", traps:["architects","asked","latest","reports"], focus:"final" },
  { text:"They were expecting the results before the audit started.", traps:["were","results","audit","started"], focus:"mixed" },
  { text:"Our clients are connected through secure endpoints.", traps:["clients","are","connected","endpoints"], focus:"mixed" },
  { text:"The tests passed, but the deployment was blocked by a missing certificate.", traps:["tests","passed","was","blocked"], focus:"mixed" },
  { text:"I am managing three distributed teams across two continents.", traps:["am","managing","teams","continents"], focus:"be" },
  { text:"The events are published once and consumed by several services.", traps:["events","are","published","consumed"], focus:"mixed" },
  { text:"We were asked to reduce costs without affecting performance.", traps:["were","asked","costs","affecting"], focus:"mixed" },
  { text:"The first request timed out, so the client retried it twice.", traps:["first","request","timed","retried"], focus:"final" },
  { text:"Those components are being replaced with managed services.", traps:["components","are","being","replaced"], focus:"be" },
  { text:"The data is encrypted at rest and in transit.", traps:["is","encrypted","rest","transit"], focus:"mixed" },
  { text:"She is leading the migration while I am reviewing the contracts.", traps:["is","leading","am","contracts"], focus:"be" },
  { text:"The logs showed that the requests were rejected by the gateway.", traps:["logs","showed","requests","were","rejected"], focus:"mixed" },
  { text:"Most incidents start with a timeout that nobody configured.", traps:["most","incidents","start","configured"], focus:"final" },
  { text:"The patients' records are stored in separate databases.", traps:["patients","records","are","stored"], focus:"mixed" },
  { text:"We are still waiting for the numbers from the finance department.", traps:["are","waiting","numbers","department"], focus:"be" },
  { text:"The breaker opened after fifty percent of the calls failed.", traps:["opened","percent","calls","failed"], focus:"final" },
  { text:"These services are designed to fail fast and recover quickly.", traps:["services","are","designed","fast"], focus:"mixed" },
  { text:"He was promoted because his estimates were consistently accurate.", traps:["was","promoted","estimates","were"], focus:"mixed" },
  { text:"The scripts must be tested before they are executed in production.", traps:["scripts","tested","are","executed"], focus:"mixed" },
  { text:"It was the most expensive mistake we made last year.", traps:["was","most","mistake","last"], focus:"mixed" },
  { text:"The contracts are versioned and the consumers are notified in advance.", traps:["contracts","are","versioned","consumers","notified"], focus:"mixed" },
];

/* ---- Listen & Repeat: frases estilo TOEFL (registro académico, una oración) ---- */
export const REPEAT_TOEFL = [
  { text:"The professor explains that photosynthesis converts light energy into chemical energy.", traps:["explains","converts","chemical"], focus:"final" },
  { text:"Researchers have found that sleep improves memory consolidation in adults.", traps:["researchers","found","improves","adults"], focus:"final" },
  { text:"Urban planners are increasingly interested in mixed-use neighborhoods.", traps:["planners","are","interested","neighborhoods"], focus:"mixed" },
  { text:"The experiment was repeated three times to confirm the results.", traps:["was","repeated","times","results"], focus:"mixed" },
  { text:"Economists argue that small businesses create most new jobs.", traps:["economists","argue","businesses","jobs"], focus:"final" },
  { text:"Ancient traders were transporting goods along established routes.", traps:["traders","were","transporting","goods","routes"], focus:"mixed" },
  { text:"The lecture focused on how glaciers shaped the landscape of northern Europe.", traps:["focused","glaciers","shaped","landscape"], focus:"final" },
  { text:"Students are expected to submit their assignments before the deadline.", traps:["students","are","expected","assignments"], focus:"mixed" },
  { text:"The study suggests that background noise reduces concentration.", traps:["suggests","reduces","concentration"], focus:"final" },
  { text:"Many species are being threatened by the loss of their habitats.", traps:["species","are","being","threatened","habitats"], focus:"be" },
  { text:"The author claims that early cities developed around reliable water sources.", traps:["claims","cities","developed","sources"], focus:"final" },
  { text:"Volunteers were asked to record their eating habits for six weeks.", traps:["volunteers","were","asked","habits","weeks"], focus:"mixed" },
];

/* ---- Listen & Repeat: textos TOEFL (párrafos cortos, se practican oración por oración) ---- */
export const REPEAT_TEXTS = [
  { title:"The honeybee waggle dance", sentences:[
    "Honeybees communicate the location of food through a movement called the waggle dance.",
    "The angle of the dance indicates the direction of the flowers relative to the sun.",
    "The duration of the movement tells the other bees how far they need to fly.",
    "Scientists confirmed this by tracking bees with tiny radar transponders." ]},
  { title:"The printing press", sentences:[
    "The printing press transformed Europe by making books cheaper and more widely available.",
    "Before its invention, manuscripts were copied by hand, which took months.",
    "As literacy increased, new ideas spread faster than governments could control them.",
    "Historians consider it one of the most important inventions of the last thousand years." ]},
  { title:"Supply and demand", sentences:[
    "In a market economy, prices are determined by the interaction of supply and demand.",
    "When a product becomes scarce, its price tends to rise until fewer people want it.",
    "Producers respond to higher prices by increasing the quantity they offer.",
    "Over time, these adjustments push the market toward a balance called equilibrium." ]},
  { title:"Exoplanets", sentences:[
    "Astronomers detect planets around other stars by measuring tiny changes in brightness.",
    "When a planet passes in front of its star, the light dims for a few hours.",
    "The size of the dip reveals the diameter of the planet.",
    "Thousands of exoplanets have been confirmed using this transit method." ]},
  { title:"Memory and sleep", sentences:[
    "During deep sleep, the brain replays experiences from the day.",
    "This process strengthens the connections between neurons that store new information.",
    "Students who sleep after studying remember more than those who stay awake.",
    "Researchers believe that sleep is essential for turning short-term memories into long-term ones." ]},
  { title:"Urban heat islands", sentences:[
    "Cities are often several degrees warmer than the surrounding countryside.",
    "Asphalt and concrete absorb heat during the day and release it slowly at night.",
    "Planting trees and painting roofs white can reduce this effect significantly.",
    "Urban planners are now required to consider heat when they design new districts." ]},
  { title:"The Silk Road", sentences:[
    "The Silk Road was not a single road but a network of trade routes across Asia.",
    "Merchants exchanged silk, spices, and precious metals over thousands of kilometers.",
    "Ideas and religions traveled along the same paths as the goods.",
    "The routes declined when sea travel became faster and safer." ]},
  { title:"Behavioral economics", sentences:[
    "Traditional economics assumes that people make rational decisions.",
    "Behavioral economists have shown that emotions and habits often influence our choices.",
    "For example, people are more afraid of losing money than they are motivated to gain it.",
    "This insight has changed how governments design savings and retirement programs." ]},
];

/* ---- utilidades ---- */
export function pick(arr, avoid){
  if(!arr.length) return null;
  if(arr.length===1) return arr[0];
  let x; do { x = arr[Math.floor(Math.random()*arr.length)]; } while(x===avoid);
  return x;
}
