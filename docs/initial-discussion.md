# Research-grounded cognitive games for a 27-month-old

## Purpose

This document summarizes the design discussion so far for a small set of computer games for a child aged **2 years 3 months (27 months)**. Its purpose is to provide context for building the first three games.

The objective is **not** to make generic “educational games,” maximize engagement, or create a progression system. The objective is to create short, calm, delightful computer experiences that exercise cognitive abilities genuinely developing at this age, while taking advantage of capabilities that are particularly well suited to a computer.

This document deliberately does **not** prescribe a product roadmap, implementation architecture, framework, deployment plan, or development plan.

---

## 1. Origin and overall intent

The project is inspired by a game the parent played as a child. His father wrote a small program in which pressing a keyboard key generated a random geometric teddy bear.

The appeal was extremely simple:

> press something → the computer creates something surprising and delightful

The aim is to create experiences with the same spirit for his son, but with the additional requirement that the interaction should be developmentally meaningful.

The games should be things the parent is actively happy for his child to play **in moderation**, rather than merely screen entertainment decorated with letters, colors, or shapes.

A central design principle is therefore:

> **Start from a cognitive ability worth exercising, not from an “educational” theme.**

Animals, vehicles, music, hiding, machines, geometric creatures, etc. are themes used to make the cognitive activity enjoyable.

---

## 2. Child and usage context

### Age and existing abilities

The child is currently **27 months old**.

Relevant observations:

* He has very good receptive language and can understand verbal explanations of what he should do.
* He recognizes common animals and vehicles.
* He already understands colors, simple shapes, big/small, same/different, and small quantities such as one versus two.
* His current interests include:

  * animals;
  * vehicles;
  * music;
  * hiding and searching;
  * matching;
  * pressing buttons.

### Current computer input ability

The realistic input at present is:

> **press broadly somewhere on the keyboard**

He does not yet reliably use a trackpad to point, click, or drag.

The first games therefore should **not make successful cognitive play dependent on trackpad proficiency**.

Direct research on laptop trackpad use at exactly 27 months is sparse. An older observational study of 2–3-year-olds interacting with computers concluded that purposeful computer interaction began appearing around 2½ years and that the **keyboard appeared to be the most appropriate input device for 2–3-year-olds**. This should be treated as suggestive rather than strong modern experimental evidence. [Interactive Multimedia for Young Children — ERIC PDF](https://files.eric.ed.gov/fulltext/ED398897.pdf?utm_source=chatgpt.com)

There is also a task-design reason for avoiding the trackpad: if a game is meant to exercise memory, inhibition, or causal reasoning, requiring difficult indirect pointing may turn it primarily into a test of **trackpad motor control**.

A separate game could eventually teach cursor control, but that is not the purpose of the first three games.

---

## 3. Session and stimulation constraints

The intended session is **roughly 10–15 minutes at most**, after which the child should move on to another, non-computer activity.

The games should deliberately remain calm.

The design does not need:

* scores, points, coins, lives, or streaks;
* achievement systems;
* escalating difficulty;
* timers that pressure the child;
* increasingly intense audiovisual stimulation;
* repeated generic praise such as “Great job!”

Instead, the reward should exist **inside the little world itself**:

> The child performs the cognitively relevant action, so the animal appears, the car drives away, the machine grows flowers, a musical phrase plays, etc.

This preserves the spirit of the geometric-teddy-bear game.

For context, WHO guidance says that for children aged 2, sedentary screen time should be **no more than one hour per day, and less is better**. The intended sessions here are deliberately much shorter. [WHO Guidelines on physical activity, sedentary behaviour and sleep for children under 5](https://iris.who.int/bitstream/handle/10665/311664/9789241550536-eng.pdf?utm_source=chatgpt.com)

---

## 4. Scientific standard for the project

It would be scientifically unjustified to claim that a particular 10-minute web game is **proven to improve long-term cognitive development**. Evidence at that level of specificity does not exist.

The defensible goal is instead to:

1. identify a cognitive process known to exist and develop at 24–30 months;
2. use a task structure related to paradigms that developmental researchers successfully administer at that age;
3. make the interaction enjoyable and appropriately simple;
4. avoid implying broad transfer beyond the exercised ability unless research supports it.

For example:

> “This game exercises response inhibition.”

is defensible.

> “This game will make him a more patient child.”

is not established.

The same standard should be applied whenever a mechanic merely *sounds* educational.

---

## 5. Why the games should be computer-specific

The child already has physical toys, blocks, puzzles, drawing materials, books, people to talk to, and opportunities for real-world play.

A computer game should therefore earn its place by exploiting capabilities such as:

* precise timing and delays;
* instantaneous contingent reactions;
* hiding and revealing information;
* procedural generation of novel animals, vehicles, or scenes;
* maintaining hidden causal rules while presenting many novel examples;
* real-time sound and animation;
* automatically resetting and repeating experiments.

Conversely, a game whose main task is simply “match the red square to another red square” does not make especially good use of a computer. Physical toys can provide the same cognitive challenge alongside richer tactile, motor, and spatial experience.

Colors, shapes, animals, etc. are still excellent **stimuli**. They simply need not be the developmental objective.

---

## 6. Screen learning: meaningful contingency, not busy interaction

Young children show a well-established **transfer/video deficit**: information learned from a 2D representation is harder for toddlers to transfer to the physical world than information learned directly.

This project should therefore not depend on an assumption that teaching something on a screen automatically generalizes into real life.

Research with 24–36-month-olds nevertheless suggests that interactivity can help when it is **specifically contingent on task-relevant information**. In younger toddlers, requiring an interaction with exactly the relevant area of the screen improved some subsequent learning compared with passive viewing, whereas generic interactivity did not produce the same effect. [Choi & Kirkorian — Touch or Watch to Learn?](https://pubmed.ncbi.nlm.nih.gov/27052556/?utm_source=chatgpt.com) [Toddlers' Word Learning From Contingent and Noncontingent Video](https://pubmed.ncbi.nlm.nih.gov/27018327/?utm_source=chatgpt.com)

The resulting design principle is:

> **One cognitive operation → one obvious action → one contingent consequence.**

Do not add interactivity merely because software makes it possible.

---

## 7. Feedback philosophy

Games need to distinguish desired and undesired actions, but mistakes should not become emotionally salient.

The working design principle is **asymmetric feedback**.

### Desired action

Give a clear, immediate, delightful consequence:

* the car drives away;
* the animal jumps out;
* the machine activates;
* a short musical phrase plays;
* a generated scene unfolds.

### Incorrect or premature action

Give a small, neutral acknowledgement:

* a tiny wobble;
* a quiet “bup”;
* an empty bush rustling;
* the object remaining where it is.

There should be no scary sound, punishment, loss, score reduction, or negative language.

Research shows that 24-month-olds can adjust their choices using feedback in learning tasks. However, detailed comparisons between types of positive and negative feedback have mostly been studied in older children. The exact “neutral mistake / delightful success” policy should therefore be understood as a **reasonable design inference**, not an experimentally proven optimal feedback policy for 27-month-olds. [Bechtel, Jeschonek & Pauen — Tool learning and feedback at 24 months](https://pubmed.ncbi.nlm.nih.gov/23465335/?utm_source=chatgpt.com) [Pauen & Bechtel-Kuehne — Toddler tool learning and executive functions](https://pubmed.ncbi.nlm.nih.gov/27138651/?utm_source=chatgpt.com)

Silence for every incorrect input was rejected partly because it is ambiguous: the child may not know whether the computer registered the action.

---

## 8. Cognitive abilities considered

The rough ranking from the discussion was:

| Ability                                | Fit around 27 months                           | Computer fit      | Priority                |
| -------------------------------------- | ---------------------------------------------- | ----------------- | ----------------------- |
| Inhibitory control                     | Excellent                                      | Excellent         | Very high               |
| Working memory                         | Excellent                                      | Excellent         | Very high               |
| Causal reasoning / prediction          | Excellent                                      | Excellent         | Very high               |
| Auditory discrimination / timing       | Good                                           | Excellent         | High                    |
| Selective attention                    | Good                                           | Good              | High                    |
| Cognitive flexibility / rule switching | Emerging, but early                            | Good              | Lower for now           |
| Colors / shapes / basic matching       | Already understood; good physical alternatives | Mediocre          | Low                     |
| Trackpad precision                     | Mostly an input/motor skill                    | Computer-specific | Not a first-game target |

The first three games therefore target:

1. **inhibitory control**;
2. **working memory**;
3. **causal reasoning**.

---

# 9. Game 1 — Ready… Go!

## Cognitive target

**Response inhibition / inhibitory control.**

The cognitive operation is:

> I want to act now → the rule says not yet → I suppress that action → the signal changes → now I act.

This is more precise than saying the game teaches “patience.” It exercises an executive-control mechanism involved in waiting, but broad transfer to patience as a personality trait should not be assumed.

## Developmental evidence

The strongest relevant research is the **Early Childhood Inhibitory Touchscreen Task (ECITT)**.

The ECITT was specifically created because many conventional inhibitory-control tasks impose too much language and working-memory demand on children under 3.

It establishes a frequent, rewarded response and then occasionally requires the toddler to inhibit that habitual response.

Important findings include:

* it works in early toddlerhood;
* longitudinal inhibitory performance improves from 18 to 24 months;
* inhibitory performance improves substantially between **24 and 30 months**;
* the improvement was particularly pronounced on inhibitory trials rather than merely reflecting general improvement at understanding or operating the task.

At 27 months, the child is directly within this rapidly developing period. [Hendry et al. — Early Childhood Inhibitory Touchscreen Task](https://pmc.ncbi.nlm.nih.gov/articles/PMC8638877/?utm_source=chatgpt.com)

## Game concept

A vehicle is waiting.

* **Red light:** do not act.
* After a short variable delay: **green light**.
* Pressing **any keyboard key** while green launches the vehicle.

The discussed delay range was approximately **0.5–3 seconds**.

The objective is a small inhibition demand, not prolonged endurance.

### Successful response

After waiting for green and pressing:

* the vehicle goes “vroom”;
* it drives through a short generated scene;
* examples discussed included bridges, sheep, tunnels, puddles, or revealing a generated animal.

Novelty should come primarily from the little scenes and consequences, not from increasing difficulty.

### Premature response

Pressing during red:

* does not launch the vehicle;
* may make it rock slightly;
* may produce a quiet neutral “bup”.

The premature response should not itself trigger an exciting animation, because otherwise successful inhibition and indiscriminate keyboard mashing become equally rewarding.

## Essential design intent

The delightful consequence must be **contingent on the cognitive operation being exercised**.

The rest of the game should stay simple enough that memory, language, strategy, or motor precision do not obscure the inhibition task.

---

# 10. Game 2 — Where Did He Hide?

## Cognitive target

**Working memory for location**, with some additional inhibition arising from the keyboard-only selector.

The cognitive operation is:

> I saw where the animal went → the animal is no longer visible → I maintain its location briefly → I recognize that location when it becomes selectable.

## Developmental evidence

Location-memory and hide-and-seek paradigms are well established in toddler research.

One longitudinal study tested children at **18, 24, and 30 months** using several nonverbal memory tasks. Its “Working Memory for Locations” task involved watching a researcher hide an object under one of several cups, obstructing the child's view for a short delay, then asking the child to retrieve it. Performance improved substantially across this age range. [Haden et al. — The Development of Children's Early Memory Skills](https://pmc.ncbi.nlm.nih.gov/articles/PMC2957538/?utm_source=chatgpt.com)

Other relevant results:

* **24–30-month-olds** can use environmental landmarks to remember hiding locations in ways 18–22-month-olds do not yet reliably use. [DeLoache & Brown — Memory for object locations](https://pubmed.ncbi.nlm.nih.gov/6617310/?utm_source=chatgpt.com)
* A transition between 18 and 24 months has been observed in several spatial-memory abilities. [Sluzenski, Newcombe & Satlow — Spatial memory in the second year of life](https://pubmed.ncbi.nlm.nih.gov/15509389/?utm_source=chatgpt.com)
* Work across toddlerhood also documents developing ability to maintain feature-location representations for hidden objects. [Kibbe & Applin — Tracking what went where across toddlerhood](https://pubmed.ncbi.nlm.nih.gov/35716069/?utm_source=chatgpt.com)

Again, these studies show that the task is developmentally appropriate; they do not establish that the game will improve working memory broadly.

## Keyboard-only selection

A conventional hiding task would ask the child to point to one of several locations, which currently creates an undesirable trackpad requirement.

The discussed solution is a reusable **one-button selector**.

Example:

1. Three bushes are visible.
2. An animal visibly hides behind one.
3. There is a short delay—roughly **2–4 seconds** was discussed.
4. The bushes begin glowing one at a time.
5. The child presses **any keyboard key** while the remembered bush is glowing.

The whole keyboard remains one enormous button while still supporting a multi-option choice.

### Correct location

* The animal jumps out.
* A brief delightful animation or musical consequence follows.

### Wrong location

* The bush rustles.
* Nothing is there.
* The selection scan can continue.

The feedback remains informative but emotionally neutral.

## Cognitive structure

This mechanic potentially combines:

* maintaining a location in working memory;
* recognizing the remembered location;
* suppressing responses while incorrect locations are highlighted.

That combination is acceptable as long as the game remains simple enough for the working-memory operation to remain clear.

---

# 11. Game 3 — The Strange Machine

## Cognitive target

**Causal reasoning and intervention.**

The cognitive operation is:

> I observe what makes this strange machine work → I infer a causal regularity → I use that knowledge to decide when to intervene.

This is intentionally different from simply matching a visible feature.

## Developmental evidence

Research shows surprisingly sophisticated causal learning at 24 months.

### Probabilistic causal evidence

Waismeyer, Meltzoff & Gopnik showed 24-month-olds evidence where one object was more likely than another to cause an effect. Toddlers subsequently chose to intervene on the object more likely to produce the effect, including conditions that separated causal probability from simple event frequency. [Causal learning from probabilistic events in 24-month-olds](https://pubmed.ncbi.nlm.nih.gov/25041264/?utm_source=chatgpt.com)

### Causal relations versus associations

Other experiments found that young children could use observed interventions to distinguish a genuine causal relation from mere correlation and then act on the causal object. [Meltzoff, Waismeyer & Gopnik — Learning About Causes From People](https://pubmed.ncbi.nlm.nih.gov/22369335/?utm_source=chatgpt.com)

There is an important nuance. Other research found that mean-24-month-old toddlers do not always spontaneously turn prediction into intervention for arbitrary, physically disconnected events. They performed better when causality involved agency, direct physical contact, or causal language. [Bonawitz et al. — The gap between prediction and action in toddlers' causal inferences](https://pubmed.ncbi.nlm.nih.gov/20097329/?utm_source=chatgpt.com)

This argues against making the game's hidden mechanism excessively opaque or arbitrary.

### Relational causal reasoning at exactly 24–30 months

Particularly relevant recent work showed that **24–30-month-olds** could observe a mechanistically opaque machine making objects larger or smaller, infer relational causal rules, and apply those rules to new objects and novel problems.

This is extremely close in spirit to the proposed game. [Goddu, Yiu & Gopnik — Causal relational problem solving in toddlers](https://pubmed.ncbi.nlm.nih.gov/39340872/?utm_source=chatgpt.com)

## Game concept

There is a mysterious machine.

The child first sees examples such as:

* yellow circle → nothing;
* blue triangle → flowers grow;
* green car → nothing;
* blue bear → flowers grow.

There is a stable underlying rule, for example:

* blue objects activate the machine;
* animals activate it;
* big objects activate it.

Novel objects then approach one at a time.

The child decides whether to intervene by pressing **any keyboard key**.

When an appropriate intervention is made, the machine does something delightful:

* grows flowers;
* makes music;
* transforms something;
* produces another short generated effect.

## The important distinction from a matching game

The game should not simply instruct:

> “Choose blue.”

Instead, it presents causal evidence and allows the child to discover:

> “Blue things seem to make this machine work.”

The interest lies in **discovering how the world works**.

## Caution

The causal rule must be reasonably inferable from the demonstrations.

Research supports significant causal reasoning at this age, but does not imply that arbitrary statistical relationships will automatically be interpreted as causal. The game should make the causal structure intelligible rather than presenting an inscrutable puzzle.

---

## 12. No required difficulty progression

The parent explicitly does **not** want a conventional difficulty curve.

These are targeted experiences for the child's current developmental stage.

The desired pattern is:

* choose a task appropriate for ~27 months;
* keep its demand within a suitable range;
* produce novelty through generated objects, characters, sounds, and consequences rather than continuously making the task harder.

When these games become too simple, different games can be created later.

---

## 13. Other ideas discussed

These are useful context but are **not part of the initial three-game scope**.

### Rhythm and auditory timing

Research comparing 18-, 24-, and 30-month-olds found that from around **24 months**, children begin deliberately adjusting their drumming tempo toward an external slower rhythm, while more accurate synchronization emerges more clearly around 30 months. [From spontaneous rhythmic engagement to joint drumming](https://pmc.ncbi.nlm.nih.gov/articles/PMC9558294/?utm_source=chatgpt.com)

A possible game involved any keyboard key acting as a drum, with the computer responding when the child's approximate tempo adapts toward a reference rhythm. It should not require adult-like beat accuracy.

### Auditory attention

Another concept was:

> listen for a particular animal sound and press only when that sound occurs.

For example, wait through *meow* and *moo*, then press on *woof*.

This would combine auditory discrimination, attention, and inhibition.

### Open causal exploration / geometric creature generator

A more direct descendant of the original teddy-bear game was also discussed.

Every press could create a random geometric creature or vehicle, but stable hidden regularities could exist—for example, one broad region of the keyboard tending to make animals and another tending to make vehicles.

The child could simply enjoy generating things, while potentially discovering the cause-and-effect structure.

This version would have **no failure state at all**.

---

## 14. Ideas deliberately deprioritized

### Basic colors and shapes

Not harmful, but low value as the central purpose of these games:

* the child already understands them;
* physical toys provide good alternatives;
* a computer does not add much.

They remain useful as stimulus features in more interesting tasks.

### Complex rule switching

Cognitive flexibility is important, but 27 months is still early for many switching paradigms.

Research in 2.5–4-year-olds shows major development around age 3, with younger children often becoming inconsistent after the governing rule changes. [Blakey et al. — Cognitive flexibility in 2-, 3-, and 4-year-olds](https://pmc.ncbi.nlm.nih.gov/articles/PMC4991299/?utm_source=chatgpt.com) [Diamond — Executive Functions](https://pmc.ncbi.nlm.nih.gov/articles/PMC4084861/?utm_source=chatgpt.com)

That makes it a less attractive current target than inhibition, working memory, and causal reasoning.

### Precise trackpad use

This may eventually be an interesting computer-specific motor skill, but should not gate success in the first three games.

---

# 15. Computing environment and guardrails

## Device decision

The original possibility was running the games on the parent's work laptop, but creating a dedicated account there would be difficult.

The current preferred environment is:

> **web-based games on the parent's wife's MacBook, in a dedicated standard macOS account for the child**

This separates the child's activity from personal/work data and allows the games themselves to remain simple web applications.

## Security model discussed

The dedicated macOS account is the **real security boundary**.

A browser game cannot guarantee that absolutely no operating-system shortcut can escape the game. macOS retains control over some system-level key combinations.

The practical requirement is therefore:

> **Random toddler keyboard mashing should be very unlikely to leave the game; if it happens anyway, the child should only reach a harmless, restricted account.**

Fullscreen/kiosk-style browser operation and keyboard interception can provide additional protection.

A deliberate parent-only exit should use an interaction that a toddler is extremely unlikely to trigger accidentally—for example, a sustained unusual action rather than an ordinary single keystroke.

No final implementation choice has been made.

---

# 16. Consolidated design constraints

1. **Target age is 27 months.**
2. **Primary input is any keyboard key.**
3. Successful play should not require precise pointing.
4. The child should normally be able to explore independently after receiving an explanation.
5. Sessions should make sense at roughly **10–15 minutes or less**.
6. Stimulation should remain calm.
7. No scores, lives, coins, streaks, leaderboards, or similar engagement mechanics.
8. No required escalating difficulty.
9. Success should cause an intrinsic consequence in the game world.
10. Errors should be neutral and informative rather than punitive.
11. In games with a meaningful success condition, the delightful response should depend on the cognitively relevant action.
12. Keep rules sparse: **one cognitive operation, one obvious action, one contingent consequence**.
13. Prefer computer-specific strengths: timing, procedural generation, sound, hidden information, contingent effects, causal structure.
14. Do not digitize physical matching exercises without a good reason.
15. Be conservative about developmental claims.
16. Do not assume learning automatically transfers from screen to real-world behavior.

---

# 17. Core research

### Inhibitory control

**Hendry et al. — The Early Childhood Inhibitory Touchscreen Task**
Directly relevant evidence for response inhibition across 18–30 months.
[Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC8638877/?utm_source=chatgpt.com)

**Diamond — Executive Functions**
Broad review of inhibitory control, working memory, and cognitive flexibility.
[Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC4084861/?utm_source=chatgpt.com)

### Working and spatial memory

**Haden et al. — The Development of Children's Early Memory Skills**
Longitudinal testing at 18, 24, and 30 months, including working memory for hidden locations.
[Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC2957538/?utm_source=chatgpt.com)

**DeLoache & Brown — Very young children's memory for the location of objects**
Relevant to use of hiding locations and landmark cues at 24–30 months.
[PubMed](https://pubmed.ncbi.nlm.nih.gov/6617310/?utm_source=chatgpt.com)

**Sluzenski, Newcombe & Satlow — Knowing where things are in the second year of life**
Evidence for developmental change in spatial representation around 18–24 months.
[PubMed](https://pubmed.ncbi.nlm.nih.gov/15509389/?utm_source=chatgpt.com)

**Kibbe & Applin — Tracking what went where across toddlerhood**
Feature-location working memory across toddlerhood.
[PubMed](https://pubmed.ncbi.nlm.nih.gov/35716069/?utm_source=chatgpt.com)

### Causal learning

**Waismeyer, Meltzoff & Gopnik — Causal learning from probabilistic events in 24-month-olds**
Toddlers use observed causal probability to guide their own interventions.
[PubMed](https://pubmed.ncbi.nlm.nih.gov/25041264/?utm_source=chatgpt.com)

**Meltzoff, Waismeyer & Gopnik — Learning About Causes From People**
Observational causal learning and intervention at 24 months.
[PubMed](https://pubmed.ncbi.nlm.nih.gov/22369335/?utm_source=chatgpt.com)

**Bonawitz et al. — Just do it?**
Important qualification concerning the difference between predicting causal relationships and spontaneously intervening.
[PubMed](https://pubmed.ncbi.nlm.nih.gov/20097329/?utm_source=chatgpt.com)

**Goddu, Yiu & Gopnik — Causal relational problem solving in toddlers**
24–30-month-olds infer causal relational rules from an opaque machine and apply them to novel problems.
[PubMed](https://pubmed.ncbi.nlm.nih.gov/39340872/?utm_source=chatgpt.com)

### Interactive screens

**Choi & Kirkorian — Touch or Watch to Learn?**
Relevant evidence on specific versus generic contingency in 24–36-month-olds.
[PubMed](https://pubmed.ncbi.nlm.nih.gov/27052556/?utm_source=chatgpt.com)

### Feedback

**Bechtel, Jeschonek & Pauen — Tool knowledge at 24 months**
Shows that toddlers can rapidly adjust choices based on feedback.
[PubMed](https://pubmed.ncbi.nlm.nih.gov/23465335/?utm_source=chatgpt.com)

### Rhythm

**Yu et al. — From spontaneous rhythmic engagement to joint drumming**
Tempo adaptation begins to become evident around 24 months.
[Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC9558294/?utm_source=chatgpt.com)

---

# 18. Short summary

The project is to create small, web-based, keyboard-driven games for a 27-month-old child. They should be calm and delightful, work with broad keyboard presses, require little or no precision pointing, and suit short independent sessions.

The first three concepts are deliberately tied to cognitive processes with strong developmental relevance around 24–30 months:

1. **Ready… Go!** — inhibit pressing until a signal permits action.
2. **Where Did He Hide?** — maintain a hidden location briefly and respond when it becomes selectable.
3. **The Strange Machine** — infer a simple causal rule from demonstrations and decide when to intervene.

The scientific objective is not to claim that these games raise intelligence or guarantee broad cognitive transfer. It is to make play that meaningfully **exercises age-appropriate cognitive processes**.

The desired emotional tone is much closer to the original geometric teddy-bear generator than to engagement-optimized children's software:

> **simple input, understandable causality, discovery, surprise, and a small delightful consequence.**
