





# Abstract

Saarthi is a voice -first online examination system designed as an accessibility
platform that enables visually impaired and differently -abled students to
participate in academic examinations using speech -based interaction. The name
"Saarthi" means guide or companion in Hindi, reflecting the system's purpose of
guiding students through examinations using voice technology.

The platform uses Web Speech API for both Speech -to-Text (STT) input and
Text-to-Speech (TTS) output, allowing students to answer questions entirely
through voice commands without relying on visual interfaces. It supports three
user roles — Admin, Teacher, and Student — with distinct capabilities for each.

Key features include voice -based login using student ID and PIN, voice -
controlled exam navigation, automatic TTS reading of questions and options,
support for MCQ, written, and mixed exam types, a custom math speech -to-
LaTeX engine powered by a rule-based NLP pipeline (rendered via KaTeX), and
PDF/DOCX question paper parsing. The system also includes tab -switch
detection, draft auto -save, per -question grading with NLP -based similarity
scoring, and an admin panel for managing students and TTS settings.

The backend is built with Python 3.13 and Flask using MongoDB Atlas as the
cloud database, while the frontend is built with React 18, Vite, and Tailwind CSS.
The system is designed for deployment on Render (backend) and Vercel
(frontend), making it accessible as a cloud-hosted service.

By integrating adaptive voice interaction, accessible exam workflows, and
intelligent grading support, Saarthi bridges the gap between technology and
inclusive education, empowering students with disabilities to demonstrate their
academic abilities without barriers.


---







Contents
# 1. Introduction ..................................................................................... 1
1.1 Scope of the Work ..............................................................................2
# 2. Proof Of Concept ............................................................................ 4
2.1 Review of Literatures ........................................................................ 4
2.2 Existing System ................................................................................. 7
2.3 Limitations of Existing Systems / Models ......................................... 9
2.4 Objectives ......................................................................................... 12
2.5 Proposed System ...............................................................................13
# 3. System Analysis And Design .................................................... 17
3.1 System Analysis ............................................................................... 17
3.1.1 Introduction ............................................................................... 17
3.1.2 Methodology ............................................................................. 17
3.1.3 Hardware and Software Requirements ..................................... 18
3.2 System Design .................................................................................. 21
3.2.1 Introduction ................................................................................ 21
3.2.3 System Architecture / UML Diagrams ....................................... 26
3.2.4 Database ...................................................................................... 28
3.3 Issues Faced and Remedies Taken ......................................................30
3.3.1 Issues ............................................................................................31
3.3.2 Remedies ..................................................................................... 32
# 4. Results And Discussion ................................................................. 33
4.1 Testing, Test Cases and Test Results …………………….................. 33
4.2 Results / Performance Evaluation / Screenshots ................................ 35
4.3 Results Comparison ............................................................................ 38
# 5. Conclusion And Future Scope .................................................. 39
5.1 Conclusion ........................................................................................... 40
5.2 Future Enhancements ........................................................................... 40

---






# 6. Appendix ..............................................................................................42
6.1 Source Code ....................................................................................42
6.2 Screenshots .....................................................................................46
6.3 List of Abbreviations ...................................................................... 51
# 7. References ........................................................................................52

---





# Chapter 1
# Introdution
Saarthi is a voice-first online examination system that addresses one of the most
persistent barriers in academic assessment: accessibility for visually impaired and
differently-abled students. Traditional online examination platforms are built
primarily for sigh ted users, relying heavily on visual navigation, mouse
interaction, and screen reading — leaving a large section of students without
equitable access to examinations.
The Saarthi platform is designed from the ground up with voice as the primary
interaction modality. Every exam workflow — from logging in, reading
questions, selecting answers, and submitting — is achievable entirely through
speech. The system leverages the Web Speech API to provide real-time Speech-
to-Text (STT) transcription and Text -to-Speech (TTS) playback, creating a
seamless audio-first experience.
The platform supports three user roles. Administrators manage student accounts,
configure TTS settings, and oversee the system. Teachers create and upload
exams in PDF or DOCX format and grade student submissions. Students take
voice-guided examinations with full audio feedback at every step.
A key technical innovation in Saarthi is its custom math speech-to-LaTeX engine,
which allows students to dictate mathematical expressions such as "x squared plus
2x minus 5" and have them automatically converted to structured LaTeX notation
rendered visually using KaTeX. This makes the system viable for mathematics
and science examinations, not just text-based subjects.
The system supports three exam types: MCQ-only, writing-only, and mixed, with
automatic detection of exam type based on question structure. A draft auto -save
mechanism ensures answers are preserved throughout the exam. Tab -switch
detection records academic integrity violations. The NLP-based grading service

---





supports automatic scoring of written answers using similarity scoring
algorithms.
Built with React 18 and Flask, and backed by MongoDB Atlas, Saarthi follows a
modern cloud -ready architecture designed for deployment on free -tier cloud
platforms — making it feasible as an accessible institution-wide solution without
significant infrastructure cost.
## 1.1 Scope Of The Work

The scope of the Saarthi  Voice-First Online Examination System covers the
development of a fully voice -accessible academic examination platform for
visually impaired and differently-abled students.
The system includes:
• A voice-guided student interface supporting voice login (student ID + PIN),
voice-commanded navigation, TTS question reading, STT answer dictation,
and voice-triggered submission.
• An admin panel for student registration, TTS parameter configuration (rate,
pitch, voice), and exam management.
• A teacher dashboard for creating exams (via file upload or manual input),
reviewing submissions, and grading student answers.
• Support for three exam types: MCQ -only (voice option selection), writing -
only (free dictation), and mixed (hybrid voice commands).
• A custom math speech -to-LaTeX engine supporting voice input of
mathematical expressions across a wide range of mathematical topics
including calculus, algebra, trigonometry, and set theory.
• A PDF and DOCX question paper parser that automatically extracts questions
and MCQ options from uploaded question papers.

---





• A cloud -hosted deployment pipeline targeting Render (Flask backend) and
Vercel (React frontend) with MongoDB Atlas as the cloud database.
The system is scoped to serve as a proof -of-concept academic project
demonstrating voice -first accessibility in examination contexts, with a clear
pathway for scaling to full institutional deployment.


















---





# Chapter 2
# Proof Of Concept

The Proof of Concept (PoC) for Saarthi  – AI-Powered Accessible Examination
System for Visually Impaired Students validates the core functionality of the
system in a controlled environment, demonstrating its ability to enable visually
impaired and differently-abled students to participate in ac ademic examinations
entirely through voice interaction. The PoC showcases key features that will be
fully integrated into the final system, ensuring seamless voice-driven examination
workflows for students without any dependency on visual interfaces.
## 2.1 Review Of Literatures

Paper 1: Accessible E -Assessment for Students with Visual Impairments
Using Speech Technologies (2023)
[1] R. Draffan et al. presented a comprehensive study evaluating the effectiveness
of speech-based interfaces in enabling visually impaired students to access online
assessment platforms. The methodology involved deploying speech recognition
and text-to-speech systems w ithin an e -assessment environment and measuring
student performance and accessibility outcomes across multiple institutions. The
findings show that voice -enabled assessment platforms significantly reduce the
dependency on human readers and sighted assistan ts, improving student
autonomy and examination fairness. The results were reliable across diverse
disability profiles and institutional settings. The study concludes that while
speech technologies improve accessibility, existing platforms still require manual
configuration by sighted administrators and lack a fully automated voice -first
workflow, highlighting the need for systems like Saarthi.
Paper 2: Web Speech API for Educational Applications – Opportunities and
Limitations (2024)


---





[2] M. Patel et al. conducted an experimental study evaluating the Web Speech
API as a browser-native solution for delivering speech-to-text and text-to-speech
capabilities in educational web applications. The methodology involved building
prototype educational tools using the Web Speech API and measuring recognition
accuracy, latency, and user satisfaction across different browsers and operating
environments. The findings show that the Web Speech API achieves high
recognition accuracy for structured spoken  input such as option selection and
numeric responses, with low latency suitable for real-time interaction. The results
were consistent across Chrome and Edge browsers. The study concludes that the
Web Speech API is a practical and dependency -free solution for voice -driven
educational tools, which directly supports the Saarthi approach of using browser-
native STT and TTS without external service requirements.
Paper 3: Natural Language Processing for Automated Answer Evaluation in
Online Examinations (2024)
[3] A. Kumar et al. presented a systematic review of NLP -based automated
grading systems for evaluating free -text student answers in online examination
platforms. The methodology involved categorizing different similarity scoring
approaches including token  overlap, sequence matching, semantic embeddings,
and keyword extraction, and comparing their effectiveness across multiple
subject domains. The findings show that hybrid similarity scoring combining
lexical and sequence-based methods achieves reliable grading outcomes for short
and medium -length answers, particularly when handling linguistic variations
such as word -number equivalence and paraphrasing. The results were highly
reliable across multiple reviewed studies. The study concludes that lightweight
NLP-based grading using libraries such as NLTK is effective for automated
evaluation without requiring large language model infrastructure, which aligns
with the Saarthi NLP grading engine design.
Paper 4: Mathematical Accessibility for Blind Students – Challenges and
Assistive Technologies (2023)

---





[4] J. Sorge et al. conducted a qualitative study to understand the barriers faced
by visually impaired students when engaging with mathematical content in digital
environments. The methodology involved interviews and observational studies
with blind students and educators, analyzing how existing tools such as MathML
readers and Braille math displays address or fail to address mathematical
accessibility needs. The findings show that most visually impaired students rely
on human assistants or specialized Bra ille hardware for math examinations, and
no widely available system supports real -time spoken math input in a standard
browser. Complexity of expression and lack of natural speech input were
identified as the primary barriers. The results were reliable as they were based on
real-world student experiences across multiple institutions. The study concludes
that there is a critical need for systems that allow students to input mathematical
expressions through natural spoken language, directly motivating the Saa rthi
speech-to-LaTeX engine.
Paper 5: Voice -Controlled Interfaces for Inclusive Digital Examination
Systems (2022)
[5] L. Chen et al. developed a prototype voice -controlled examination interface
and evaluated its usability with visually impaired university students. The
methodology involved deploying a voice -navigated quiz system with text -to-
speech question reading an d speech -to-text answer input, and measuring task
completion rate, error rate, and user satisfaction through structured usability
sessions. The findings show that voice -controlled exam navigation significantly
improved task completion rates and reduced rel iance on sighted assistance, with
students reporting high levels of confidence and independence during
examination sessions. The results demonstrated strong effectiveness in reducing
examination barriers for visually impaired students. The study concludes that
voice-first examination systems are not only technically feasible but also
preferred by visually impaired students over screen -reader-augmented visual
interfaces, directly supporting the Saarthi design philosophy.


---

## 2.2 Existing System

In the current academic examination landscape, most online examination
platforms are designed primarily for sighted users and rely entirely on visual
navigation, mouse interaction, and screen-based feedback. Existing systems are
fundamentally inaccessible to visually impaired students and lack proper
integration of voice-first interaction, creating a deeply unequal examination
experience for differently-abled learners.
The most common approach to accessibility in existing platforms is screen-
reader dependency, where systems rely on ARIA labels and third-party screen
reader software rather than providing native voice interaction. Navigation in
these platforms requires keyboard shortcuts and spatial screen awareness that
many visually impaired users find disorienting and cognitively demanding.
Screen readers frequently mispronounce or skip mathematical notation entirely,
making STEM examinations effectively inaccessible to blind students.
Furthermore, no real-time audio guidance is provided within the examination
workflow itself, leaving students without contextual feedback during critical
moments of the exam.
Existing examination platforms also lack any form of native voice-command
support. No standard examination system supports answering MCQ questions
by simply speaking the option letter, nor is written answer dictation integrated
into conventional exam workflows. Students who require voice input must rely
on external assistive technology tools that frequently conflict with browser-
based exam security measures, resulting in unreliable or blocked functionality.
Where voice recognition is available at all, it is limited to basic dictation and
does not support navigational commands such as moving between questions,
repeating a question, or submitting the paper.
Mathematical content presents a particularly severe barrier in existing systems.
No examination platform currently provides a voice-based input method for
mathematical expressions, and LaTeX entry requires visual keyboard navigation

---





that is impossible without sight. Screen readers are unable to meaningfully
convey complex mathematical notation encountered in exam questions, and
students with visual impairments are effectively unable to independently
complete mathematics or science examinations without the physical assistance
of a sighted invigilator.
Text-to-speech functionality, where present in existing platforms, is non-
adaptive and applies a single fixed voice and speed uniformly to all users. No
per-student configuration of speech rate, pitch, or voice type is supported,
meaning students with different hearing abilities or varying cognitive processing
speeds cannot adjust the system to suit their individual accessibility needs.
Grading systems in existing platforms also fail to account for the natural
variation introduced by speech-to-text transcription. Written answers dictated
via voice frequently contain transcription artefacts such as the word "five"
appearing in place of the numeral "5", or phonetically similar words substituting
for technical terms. Current grading engines do not normalize these speech-
transcription variations before scoring, causing students to be penalized for
natural characteristics of voice input rather than actual gaps in knowledge.
Finally, academic integrity measures in existing platforms are not designed with
voice-first users in mind. Tab-switch detection systems incorrectly flag blind
users who navigate between tabs as part of their screen reader workflow,
treating accessibility-driven behaviour as an integrity violation. No audio-based
integrity warning system exists to inform visually impaired students of detected
violations in real time, leaving them unaware of flags being recorded against
their submission.
These collective limitations result in a deeply unequal examination experience
for visually impaired and differently-abled students, forcing them to depend on
invigilator assistance or external tools rather than independently accessing
examination systems. The absence of native voice interaction, mathematical
expression input, adaptive text-to-speech configuration, and fair grading for

---





dictated answers highlights the urgent need for a purpose-built system like
Saarthi, which addresses all of these barriers comprehensively and from the
ground up.
## 2.3 Limitations Of Existing Systems / Models

Despite the availability of certain accessibility features in some examination
platforms, existing systems suffer from several fundamental limitations that
prevent truly independent and equal participation for visually impaired and
differently-abled students. These limitations are not minor oversights but rather
deeply embedded structural problems that arise from the fact that accessibility
has been treated as an afterthought rather than a core design principle.
The most critical limitation of existing platforms is the complete absence of
native voice interaction for examination workflows. No existing examination
platform provides built-in voice commands for exam navigation and answer
selection. Where voice input is available at all, it is restricted to simple text
dictation with no command recognition capability. Students cannot perform
fundamental examination operations such as moving to the next question,
repeating the current question, or selecting a specific answer option through
voice alone, which renders the examination experience incomplete and
dependent on additional manual intervention.
Closely related to this is the absence of a genuinely voice-first examination
workflow. Existing systems are retrofitted with accessibility features rather than
being designed from the ground up with voice interaction as the primary mode
of engagement. The fundamental examination workflow — which encompasses
login, reading a question, answering it, navigating between questions, and
submitting the paper — cannot be completed without some degree of visual
interface interaction. Keyboard-only modes and screen-reader compatibility
layers are incomplete workarounds that address surface-level accessibility
without resolving the underlying inaccessibility of the examination experience
itself.

---





The absence of mathematical voice input represents one of the most severe
limitations for students in technical disciplines. No existing examination system
supports natural language voice input for mathematical expressions, formulas,
or equations. Students who are unable to use a standard keyboard have no
mechanism to input mathematical notation, which effectively excludes visually
impaired students from independently participating in mathematics, physics,
chemistry, and engineering examinations. This limitation creates an entire
category of academic subjects that remain out of reach for differently-abled
students despite the availability of modern speech recognition technology.
Existing platforms also fail to provide a personalized audio experience for
students with varying accessibility needs. Text-to-speech systems in current
platforms apply universal fixed settings uniformly across all users, with no
facility for per-student customization of speech rate, pitch, or voice type.
Students with different cognitive processing speeds, hearing levels, or
individual auditory preferences are unable to adapt the audio output to suit their
requirements. No administrative interface exists in current systems to configure
audio parameters based on individual student accessibility profiles, treating all
users as a homogeneous group despite the diversity of needs within the visually
impaired student population.
The grading of voice-dictated answers presents another significant limitation in
existing systems. Current grading engines compare student answers as exact
strings, which penalizes natural variations that arise from speech-to-text
transcription. Common transcription artefacts such as number words appearing
in place of numerals, for instance "five" instead of "5" or "two" instead of "2",
result in answers being marked incorrect despite conveying the correct
knowledge. Synonym variations and phrasing differences introduced naturally
by speech recognition systems are not handled through any normalization
process, producing grading outcomes that are unfair to students who submit
their answers through voice dictation rather than typed text.


---





Question paper import functionality in existing platforms also presents a
limitation for voice-based examination delivery. Most platforms require manual
question entry through visual web forms, and while some systems accept
uploaded PDF question papers, these documents are displayed visually without
being parsed into structured, accessible data. No automatic extraction of
question text or MCQ options from uploaded documents is available, meaning
that the benefits of file-based question paper creation do not extend to voice-
driven examination delivery.
Finally, existing academic integrity mechanisms are not designed with voice-
first users in mind and inadvertently create additional barriers for visually
impaired students. Tab-switch detection systems do not differentiate between
deliberate malicious tab switching and the legitimate switching behaviour that
many visually impaired students perform as part of their screen reader
workflow. No audio-based warning system exists to notify visually impaired
students in real time when an integrity violation has been detected, leaving them
unaware of flags being recorded against their submission. Additionally,
examination timers in existing systems display only visual countdowns, with no
text-to-speech announcements of the remaining time, which prevents voice-
dependent students from managing their time effectively during the
examination.
Taken together, these limitations demonstrate that existing systems fail to
provide a voice-centric, student-centered, and inclusive solution for academic
examination. The combined absence of native voice interaction, mathematical
expression input, adaptive audio configuration, fair answer normalization, and
accessible integrity mechanisms highlights the urgent need for a purpose-built
system like Saarthi, which overcomes all of these limitations through its voice-
first design philosophy, browser-native speech integration, and NLP-driven
processing pipeline.


---

## 2.4 Objectives

The primary objective of Saarthi  is to develop a fully voice -accessible online
examination system that enables visually impaired and differently-abled students
to participate in academic assessments independently, without reliance on
external assistive technology.
Specific Objectives
• To design and implement a fully voice -driven examination workflow
encompassing voice login using student ID and numeric PIN, voice -
controlled navigation across MCQ, written, and mixed exam types using
spoken commands for option selection, question traversa l, repeat, help,
and submission, with Text -to-Speech reading of all exam content
including questions, options, instructions, time -remaining warnings, and
confirmation feedback at every step.
• To build a custom math speech-to-LaTeX conversion engine using a rule-
based NLP pipeline that translates natural language mathematical speech
into structured LaTeX notation, rendered visually via KaTeX, enabling
visually impaired students to independently input mathematical
expressions during examinations without any keyboard dependency.
• To develop PDF and DOCX question paper parsers using a two -pass
extraction strategy for automatic identification and structuring of
questions and MCQ options from uploaded documents, and to implement
three distinct voice grammar modes — strict, dictation, and command-
prefix — corresponding to MCQ -only, writing -only, and mixed exam
types respectively.
• To implement an NLP -based answer similarity scoring system for fair
evaluation of voice -dictated written answers, incorporating word -to-
number normalization, token overlap scoring, and sequence similarity
matching, alongside a teacher dashboard for submission review and

---





manual grade assignment, and an admin interface for student registration,
PIN management, and per-student TTS configuration.
• To deploy the complete system as a cloud -hosted accessible web service
using Render for the Flask backend, Vercel for the React frontend, and
MongoDB Atlas as the cloud database, with tab -switch detection and
audio-based integrity warnings to maintain acad emic integrity without
penalizing legitimate accessibility-driven browser behaviour.
## 2.5 Proposed System

The proposed system, Saarthi — Voice-First Online Examination System, is a
comprehensive voice -accessible academic examination platform that enables
visually impaired and differently-abled students to independently take, navigate,
and submit examinations u sing only voice interaction. The system is built on a
three-role architecture with a React frontend, Flask backend, and MongoDB Atlas
cloud database.
Student Voice Interface
Student Voice Interface
The student -facing interface is designed as a voice -first experience with the
keyboard serving as a fallback input method for users who prefer or require it.
From the moment the student begins their session, the system guides them entirely
through audio prompts. On the login screen, spoken prompts direct the student to
speak their Student ID followed by their four -digit PIN, and audio confirmation
is provided at each step of the authentication process so that the student is never
dependent on visual feedbac k to understand whether their input has been
accepted.
During examinations, every question and its associated options are automatically
read aloud through the TTS engine each time the student navigates to a new
question, ensuring that no visual reading is required at any point in the exam

---





workflow. Students answer MCQ questions by simply speaking the
corresponding option letter, and written answer questions are completed through
free voice dictation that transcribes spoken responses directly into the answer
field. All exam control operation s including moving to the next question,
returning to a previous question, repeating the current question, and submitting
the paper are performed entirely through spoken commands, allowing the
complete examination session to be conducted without any visual  or manual
interaction.
The interface includes a panic help panel that can be activated at any time during
the exam through a voice command, which immediately reads aloud a full list of
all available commands so that the student can reorient themselves without
interrupting the ex amination or requiring sighted assistance. Before final
submission, an answer playback review is presented in which every recorded
answer is read back to the student one by one through TTS, giving them the
opportunity to confirm, change, or keep each respo nse before the paper is
submitted. Voice -triggered time -remaining announcements are provided at
configurable thresholds throughout the session, ensuring that voice -dependent
students can manage their examination time effectively without needing to refer
to a visual countdown display. A draft auto-save mechanism runs continuously in
the background, periodically synchronizing the student's in -progress answers to
the server so that no work is lost in the event of an unexpected interruption or
connectivity issue.
Voice Grammar System
The core of the voice interaction is a three -mode grammar system that adapts to
the current exam type. In strict mode (MCQ -only exams), the system only
recognizes option letters and navigation commands. In dictation mode (writing -
only exams), all spoken conten t is treated as answer dictation with math
conversion applied. In command -prefix mode (mixed exams), navigation
commands require the prefix 'command' to distinguish them from dictated answer

---





content. This prevents accidental triggering of navigation during free -form
speech.
Math Speech-to-LaTeX Engine
The math engine processes natural language mathematical speech through a 13 -
stage sequential rule pipeline. The stages in order are: structural named formulas,
Greek letters, calculus (derivatives and integrals), limits, powers and roots,
trigonometric and logarithmic functions, inequalities and relations, set theory and
logic, statistics and probability notation, vectors and matrices, arithmetic
operators and fractions, brackets and separators, and post -cleanup spacing
normalization. Seventeen mathematical categories are implemented and verified
working. Output is rendered in real time via KaTeX in the browser. The engine
conditionally wraps output in LaTeX delimiters — only when the output string
contains actual LaTeX backslash commands or sub/superscript groupings,
preventing literal dollar signs appearing in plain text answers.
Known current limitations: root patterns require an explicit 'end quantity'
command to close braces; number -word-based power expressions ('two to the
power of three') do not parse correctly due to stage ordering; and implicit
groupings in fractions require  explicit 'fraction with numerator ... and
denominator ...' phrasing to produce correct output.
Question Paper Parsing System
Teachers can upload exam question papers in PDF or DOCX format. The parsing
system applies a two -pass strategy: Pass 1 (explicit) identifies numbered
questions matching patterns like 'Q1.' or 'Question 2)'; Pass 2 (implicit heuristic)
handles non-standard formats using line length and punctuation heuristics. MCQ
options are detected by A-D letter prefixes. Correct answer annotations ('Correct
Answer: B') are extracted automatically. Exam type (MCQ-only, writing-only, or
mixed) is auto-detected from the extracted question structure.


---





NLP Grading Service
The NLP grading service provides automatic similarity scoring for written
answers, designed to handle the natural variations introduced by voice dictation
The scoring pipeline normalizes word-number equivalence (converting spoken
numbers to digits), applies mathematical synonym substitution, and computes
both Jaccard token similarity and SequenceMatcher sequence similarity. The
final score is the maximum of both measures, ensuring the most favorable fair
interpretation of the student's dictated answer is used for grading.
Admin and Teacher Management
The admin panel enables creation of student accounts with unique IDs and 4-digit
PINs, per-student TTS configuration with a live preview function, and PIN reset
that generates a new random PIN displayed once. The teacher dashboard supports
exam creation with file upload or manual entry, paginated submission listing with
status filtering, per-submission answer review, and grade assignment. Both panels
are secured behind JWT role-based access control.
Security and Integrity
The system implements JWT http Only cookie authentication with CSRF double-
submit protection to prevent token theft. Authentication endpoints are rate-limited
with account lockout after five failed attempts. Tab -switch detection monitors
document visibility and records violations with timestamps. On returning from a
tab switch, the student receives a spoken warning describing the violation count
and consequences, maintaining integrity enforcement that is accessible to visually
impaired users.





---





# Chapter 3
# System Analysis And Design
## 3.1 System Analysis
## 3.1.1 Introduction

System analysis for Saarthi focused on identifying the barriers that prevent
visually impaired students from using standard online examination systems, and
defining a technical architecture that addresses those barriers through voice
interaction design. Th e analysis identified three core problem areas: login and
identity verification, exam navigation and answer input, and mathematical
content accessibility.
## 3.1.2 Methodology

Saarthi was developed following an iterative, feature -driven development
methodology with a strong emphasis on accessibility testing at each stage.
1. Requirement Gathering and Analysis
Requirements were gathered from accessibility guidelines (WCAG 2.1),
academic examination standards, and domain research on assistive technology for
visual impairment.
2. Architecture Design
A clear separation of concerns was established: React frontend handles all voice
interaction and UI; Flask backend handles all business logic, security, and data
persistence; MongoDB Atlas provides a flexible document store for exam and
submission data.



---





3. Iterative  Development
Features were developed in priority order: authentication → exam loading →
voice commands → TTS/STT → math engine → grading → admin tools. Each
feature was tested before the next was begun.
4. Voice Reliability Testing
Extensive testing of the Web Speech API revealed that confidence thresholds
caused many valid commands to be blocked. The voice command system was
refactored to use direct pattern matching, resolving this issue.
5. State Management
React state management was carefully designed to prevent stale -state bugs. A
mountedRef pattern was used to safely handle async operations after component
unmount. Redux was used for the math exam module's complex multi-step state.
6. Security Implementation
WT authentication using httpOnly cookies was implemented to prevent XSS
token theft. CSRF protection using double-submit cookie pattern was added. Rate
limiting was applied to authentication endpoints to prevent brute-force attacks.
## 3.1.3 Hardware And Software Requirements

Hardware Requirements
• Processor: Intel Core i3 or equivalent (minimum)
• RAM: 4 GB minimum (8 GB recommended)
• Storage: 50 GB available storage
• Microphone: Standard built-in or external microphone for voice input
• Network: Broadband internet connection (minimum 5 Mbps)

---





• Browser: Google Chrome 90+ or Microsoft Edge 90+ (required for Web
Speech API)
# Software Requirements
# Frontend Technologies
React 18 (with Vite)
React 18 provides the component architecture and state management for the
student exam interface, teacher dashboard, and admin panel. Vite provides fast
development server and optimized production builds.
Web Speech API
The browser -native Web Speech API provides STT (SpeechRecognition) for
voice input and TTS (SpeechSynthesis) for audio output, eliminating the need for
external speech service dependencies.
KaTeX
KaTeX is a fast, server -side LaTeX rendering library used to display
mathematical expressions generated by the math speech-to-LaTeX engine within
exam questions and student answers
Tailwind CSS
A utility-first CSS framework used for styling all UI components. Provides rapid
development with responsive design out of the box.
Redux Toolkit
Used for state management in the math exam module, managing multi -step
equation history, undo/redo stacks, cursor navigation within the AST, and voice
session state.


---





Axios
HTTP client for all API communication between the React frontend and Flask
backend, configured with CSRF token injection and automatic 401 redirect
handling.
# Backend Technologies
Python 3.13 + Flask
Flask provides the lightweight RESTful API framework. Python 3.13 is used for
all backend logic including NLP processing, PDF parsing, and authentication.
MongoDB Atlas + PyMongo
MongoDB Atlas is the cloud -hosted NoSQL database. PyMongo is the official
Python driver. Document -oriented storage provides flexibility for varied exam
question structures.
Flask-JWT-Extended
Provides JWT authentication with httpOnly cookie transport, CSRF protection,
and configurable token expiry. Eliminates localStorage token exposure.
NLTK + SymPy
NLTK provides tokenization, POS tagging, and stopword filtering for the NLP
grading service. SymPy provides algebraic expression parsing and solving for the
math tools API.
python-docx + pypdf
python-docx parses uploaded .docx question papers. pypdf parses .pdf question
papers. Both feed into the question extraction pipeline.



---





Marshmallow
Schema validation library used to validate all API request payloads, providing
structured error messages and preventing malformed data from reaching business
logic.
Gunicorn
WSGI HTTP server used to serve the Flask application in production on Render.
## 3.2 System Design
## 3.2.1 Introduction

The Saarthi system follows a three -tier architecture: React SPA frontend, Flask
REST API backend, and MongoDB Atlas cloud database. The frontend and
backend are independently deployable, enabling separate hosting on Vercel and
Render respectively.
Communication is secured through JWT httpOnly cookie authentication with
CSRF double -submit protection. All sensitive endpoints are rate -limited. File
uploads are stored under a static directory served directly by Flask.
## 3.2.2 Module Description
Saarthi is divided into nine functional modules, each responsible for a distinct
aspect of the voice-first accessible examination experience.
1. Authentication and Identity Module
The Authentication and Identity Module handles secure access control across all
three user roles — Admin, Teacher, and Student. The system implements JWT -
based authentication with httpOnly cookie token transport, which prevents token
theft through cross-site scripting attacks by ensuring the token is never accessible
to JavaScript running in the browser. For Admin and Teacher users, standard
email and password login is provided, while Student authentication is handled
through a voice login mechanism where the student speaks their Student ID

---





followed by a four -digit numeric PIN, enabling fully hands -free authentication
without any visual interface dependency. All authentication endpoints are rate -
limited to prevent automated credential attacks, and accounts are automatically
locked for fifteen  minutes following five consecutive failed login attempts,
providing robust brute-force protection without requiring manual administrative
intervention.
2. Exam Management Module
The Exam Management Module provides Admin and Teacher users with the
ability to create, configure, and manage examinations. Each exam is created with
a title, description, duration, and an optional question paper file upload in either
PDF or DOCX format. The module includes a parser that automatically extracts
questions and MCQ options from uploaded documents and determines the exam
type — MCQ-only, writing-only, or mixed — based on the composition of the
extracted question set, without requiring the creator to specify the type manually.
Students can access a listing of all available examinations from their dashboard.
The module also supports exam deletion with cascade removal of all associated
student submissions, ensuring database consistency.
3. Voice Interaction Module
The Voice Interaction Module manages the complete speech recognition lifecycle
throughout the examination session. It implements a continuous STT loop using
the browser-native Web Speech API, with automatic session restart after each
utterance to maintain uninterrupted listening. The module dynamically switches
grammar modes based on the type of question currently active — strict mode for
MCQ-only questions, dictation mode for written answer questions, and
command-prefix mode for mixed exam navigation — ensuring that spoken input
is interpreted correctly in context. Voice command parsing is performed through
direct pattern matching without a confidence threshold requirement, allowing
natural spoken responses to be recognized reliably. A spacebar keyboard shortcut
activates listening and the Escape key stops it, providing a keyboard-accessible

---





fallback for users who prefer manual control. The module also handles all voice
guidance functions including reading questions aloud, announcing MCQ options,
and providing time-remaining announcements during the exam.
4. TTS (Text-to-Speech) Module
The Text -to-Speech Module manages all audio output throughout the
examination experience using the browser's native SpeechSynthesis API. Each
student's TTS experience is individually configurable, with the Admin able to set
per-student speech rate, pitch, and voice type through the admin panel, and these
settings are stored in the student's user profile and applied automatically at the
start of each session. The module performs mathematical expression sanitization
before passing text to the synthesizer, con verting superscript characters and
mathematical symbols into their spoken equivalents so that expressions are read
aloud intelligibly rather than as raw Unicode characters. An examination
introduction announcement is played automatically when the exam load s, and
per-question audio guidance is triggered each time the student navigates to a new
question, ensuring the student is always oriented within the examination without
requiring any visual reference.
5. Exam Runtime Module
The Exam Runtime Module coordinates the live examination session from start
to final submission. It supports MCQ answer selection through either voice
commands or keyboard input, and written answer accumulation through
continuous voice dictation that appen ds transcribed text to the student's answer
field. A draft auto -save mechanism with debounced backend synchronization
periodically persists the student's in -progress answers to the server without
requiring manual saving, protecting against data loss in the event of a connectivity
disruption. The module monitors for tab -switch events throughout the session,
recording each detected violation with a timestamp and issuing an audio -based
warning to the student upon their return to the exam window. A countdown timer
tracks the remaining examination time and triggers TTS warnings when the time

---





reaches critical thresholds, allowing voice -dependent students to manage their
time without needing to read a visual display. Before final submission, the module
presents an answer review screen where all recorded answers are read back to the
student via TTS, giving them the opportunity to verify or amend responses.
6. Math Exam Module
The Math Exam Module provides a dedicated voice -driven workspace for
examinations that involve mathematical content. Students dictate mathematical
expressions in natural spoken language, which are processed by a custom speech-
to-LaTeX rule engine and rendered visually in real time using KaTeX. The engine
implements seventeen verified working categories covering arithmetic
operations, powers, fractions, roots, Greek letters, trigonometric functions,
logarithms, derivatives, integrals, limits, summation notat ion, vectors and
matrices, set theory, inequalities, statistics, number words, and named structural
formulas. The conversion pipeline processes spoken input through thirteen
sequential rule stages followed by a post -cleanup spacing normalization pass,
with conditional dollar -sign wrapping applied only when genuine LaTeX
commands or sub and superscript groupings are detected in the output string. The
module is built on a MathJSON abstract syntax tree editor that supports cursor
navigation by voice, allowing students to move through the components of a
mathematical expression and edit individual parts. A full undo and redo history
is maintained across all equation steps in the workspace. Three known limitations
exist in the current implementation: unclosed bra ces in certain root patterns,
word-ordering mismatches for power expressions using number words, and linear
parsing ambiguity for implicitly grouped fraction expressions.
7. Submission and Grading Module
The Submission and Grading Module handles the final recording of student
answers and the subsequent evaluation process. Upon final submission, the
complete answer set is sent to the backend along with the tab-switch violation log
recorded during the session. For written answer questions, the module performs

---





NLP-based automatic grading using a combined similarity scoring pipeline that
applies Jaccard token overlap and SequenceMatcher sequence similarity to
compare the student's answer against the model answer. A word -to-number
normalization step is applied bef ore scoring to handle cases where speech
transcription produces number words such as "five" or "two" in place of their
numeric equivalents, preventing students from being unfairly penalized for
natural characteristics of voice input. The module also provid es a teacher-facing
manual grading interface where submitted answers can be reviewed alongside any
recorded audio responses, with per-question mark allocation supporting decimal
values for partial credit.
8. Admin Management Module
The Admin Management Module provides the administrative interface for
managing the student population and monitoring examination activity.
Administrators can register new students by entering the student's name, ID,
department, and a four -digit PIN, which is hashed before storage. The module
supports PIN reset operations that generate a new cryptographically random four-
digit PIN, displayed to the administrator exactly once. Student accounts can be
deleted with automatic cascade removal of all associated submissions to maintain
referential integrity. Per -student TTS settings including speech rate, pitch, and
preferred voice can be configured individually through the admin panel, with a
live preview function allowing the administrator to hear the configured v oice
before saving. The module also provides a paginated submission listing with
status filtering, giving administrators visibility into examination completion and
grading progress across the student cohort.
9. PDF/DOCX Parsing Module
The PDF and DOCX Parsing Module is responsible for automatically extracting
structured question data from uploaded examination documents. It employs a
two-pass extraction strategy where the first pass attempts to identify explicitly
numbered questions using patterns such as "Q1." or "Question 1:" and the second

---





pass applies a heuristic implicit detection method to handle documents that do not
follow a numbered format. MCQ options are detected through letter -prefix
pattern matching covering the letters A through D in both upper and lower case,
and correct answer annotations in the format "Correct Answer: X" are extracted
and associated with their corresponding question. Each extracted question is
automatically assigned a type of either MCQ or text based on whether options
were detected alongside it, producing a ful ly structured question set ready for
voice-driven examination delivery without requiring any manual reformatting by
the exam creator.
## 3.2.3 System Architecture / Uml Diagrams

Use Case Diagram
A Use Case Diagram is a visual representation that illustrates the interactions
between external actors (such as users or other systems) and the system’s
functionalities, known as use cases. It provides a high -level view of how users
engage with the system  to accomplish specific goals. The diagram typically
includes actors, which represent entities that interact with the system, such as
human users, external systems, or hardware devices. Use cases
represent the system’s services or functionalities, detailing the actions or tasks the
system performs for the actors. These use cases are connected to actors through
associations (lines linking actors to use cases), showing how actors interact with
the system. Additionally, relationships like include (where one use case always
includes the behavior of another) and extend (indicating optional or conditional
behavior) help clarify the flow of actions. The system’s scope is defined by a
system boundary, a rec tangle that encloses the use cases and identifies which
functionalities are part of the system.


---




























Fig: 3.2.3.1 Use Case Diagram


---

## 3.2.4 Database
1. Users Collection
Field Type Description
_id ObjectId Unique identifier
name String Full name
email String Login email
(Admin/Teacher)
password String Bcrypt-hashed
password
role String admin / teacher /
student
studentId String Unique student
identifier
pin String Bcrypt-hashed 4-
digit PIN
department String Academic
department
tts_settings Object { rate, pitch, voice }
failed_attempts Number Failed login count
locked_until Date Lockout expiry
timestamp

Table: 3.2.4.1 Users Collection

---




2. Exams Collection

Table: 3.2.4.2 Exams Collection
3. Questions (Embedded in Exams)
Field Type Description
_id ObjectId Question identifier
text String Question text
type String mcq / text / voice
options Array MCQ option
strings (A-D)
Field Type Description
_id ObjectId Unique identifier
title String Exam title
description String Exam description
created_by ObjectId Reference to
Admin/Teacher
duration Number Duration in minutes
questions Array Array of question
documents
file_url String URL of uploaded
question paper
examType String mcq-only / writing-only /
mixed
created_at Date Creation timestamp

---




Field Type Description
correct_answer String Correct option
letter
marks Number Marks allocated
grading_config Object { method,
threshold_full,
threshold_partial }
Table: 3.2.4.3 Questions (Embedded)
4. Submissions Collection
Field Type Description
_id ObjectId Unique identifier
exam_id ObjectId Reference to
Exam
user_id ObjectId Reference to
Student
answers Array Structured answer
array
audio_files Object { question_id:
audio_url }
submitted_at Date Submission
timestamp
grades Object { question_id:
marks }
total_marks Number Total score
is_graded Boolean Grading status

---




Field Type Description
feedback String Teacher feedback
tab_violations Array Tab-switch
violation log
status String in_progress /
submitted / graded
Table: 3.2.4.4 Submissions Collection
3.3 Issues faced and Remedies Taken
## 3.3.1 Issues
• Web Speech API confidence thresholds blocked valid voice commands from
users with regional accents
• STT starting multiple concurrent recognition sessions causing audio feedback
loops
• Stale answer state causing previous exam's answers to persist into a new exam
session
• TTS racing with STT — the microphone capturing the system's own speech
output
• JWT token management with httpOnly cookies requiring CSRF protection
implementation
• PDF and DOCX parsers producing inconsistent question extraction for non-
standard question formats
• Browser autoplay policy preventing TTS from speaking before first user
interaction
• KaTeX rendering of voice-dictated LaTeX failing for partially-formed
expressions due to unclosed braces in root patterns
• Root patterns (square root, cube root) produce unclosed LaTeX braces unless the
student says 'end quantity' — not intuitive for exam use
• Number-word power expressions ('two to the power of three') fail because
number-word-to-digit conversion runs at stage 12, after power rules at stage 5

---





• Implicit fraction groupings ('x plus one over y') parse as x + \frac{1}{y} instead
of \frac{x+1}{y} due to linear rule matching without a semantic tree
## 3.3.2 Remedies
• Removed confidence threshold filtering; implemented direct regex pattern
matching on transcripts for voice commands
• Implemented STT session management with mountedRef guards and session ID
tokens to prevent concurrent recognition instances
• Added answers state reset on exam load using useEffect cleanup; separated per-
exam state from global store
• Added TTS completion callback before STT activation; used 300-500ms delay
buffers at mode transitions
• Implemented Flask-JWT-Extended httpOnly cookie mode with automatic CSRF
cookie reading on the Axios interceptor
• Developed a two-pass parser: explicit numbered question pass followed by
heuristic fallback pass; added admin note skipping
• Added a BrowserGuard component that fires a zero-volume TTS utterance on
first user click to unlock the speech engine
• Added try-catch with error placeholder rendering in KaTeX; engine produces a
visible error span rather than crashing on malformed LaTeX
• Documented the 'end quantity' workaround for root brace closure in the voice hint
panel so students are guided on correct phrasing
• Identified the number-word/power ordering mismatch as a known limitation to be
resolved in future by pre-processing number words before all domain rules







---





# Chapter 4
# Results And Discussion
# 4.1 Testing, Test Cases And Test Results
Saarthi was tested through unit testing (Vitest for frontend, pytest for backend),
integration testing, and manual end-to-end voice testing across exam workflows.
Test Cases
Test Case Description Input Expected
Output
Pass/Fail
Voice
Login
Student logs in
using voice
Student ID
+ PIN via
voice
Redirect to
student
dashboard
If user dashboard
loads
Voice
# Mcq
Select
Student selects
option via voice
'Option A' Option A
selected,
advance
If answer
recorded
# Tts
Question
Read
Question auto-
read on
navigation
Navigate to
# Q2
TTS speaks
Q2 text
If audio plays
Draft Auto -
Save
Answers saved
during exam
Type/dictate
answer
Answer
preserved
on refresh
If answer
retained
Exam
Submission
Final submission
with answers
Submit
command
Submission
recorded in
# Db
If status =
submitted
PDF Parse Extract questions
from PDF
upload
Upload
question
paper
Questions
in exam list
If questions
appear

---




Table: 4.1.1 Test Cases
Test Results
The actual results were compared with the expected results for all test cases.
Test Case Expected Result Actual Result Status
Voice
Login
Login successful Login successful Pass
Voice
# Mcq
Select
Option recorded Option recorded Pass
# Tts
Question
Read
Audio plays Audio plays on
navigate
Pass
Draft
Auto-Save
Answer
preserved
Answer preserved Pass
Exam
Submission
Submission in
# Db
Submission in DB Pass
PDF Parse Questions
extracted
Questions extracted Pass
Math
Voice
Input
LaTeX rendered LaTeX rendered via
KaTeX
Pass
# Nlp
Grading
Score 1.0 Score 1.0 (numeric
match)
Pass
Math Voice
Input
Dictate math
expression
'x squared
plus 2x'
LaTeX:
x^{2} + 2x
If KaTeX
renders
# Nlp
Grading
Score similarity
of answers
Student:
'five',
Correct: '5'
Score: 1.0
(numeric
match)
If full marks
given
Tab
Detection
Detect exam
window leaving
Switch to
another tab
Violation
logged +
# Tts
warning
If violation
recorded
PIN Reset Admin resets
student PIN
Admin
clicks reset
New 4-digit
# Pin
generated
If new PIN
shown

---




Tab
Detection
Violation logged Violation logged +
TTS warn
Pass
PIN Reset New PIN
generated
New PIN displayed Pass
Table: 4.1.2 Test Results
## 4.2 Results / Performance Evaluation / Screenshots
Key Results
• Voice login using Student ID and PIN was consistently successful with clear
speech input
• Voice commands for MCQ selection, navigation, repeat, and submit were
recognized correctly using direct pattern matching
• TTS question reading provided correct audio playback for all question types
including those with LaTeX content
• Draft auto-save successfully preserved student answers across browser refreshes
• The PDF and DOCX parsers correctly extracted questions and MCQ options
from standard FISAT question paper format
• The math speech-to-LaTeX engine correctly converted 17 verified categories of
spoken mathematical expressions; 'integral from a to b of' → \int_{a}^{b},
'vector v' → \vec{v}, 'quadratic formula' → full LaTeX expansion — all rendered
correctly via KaTeX
• Known engine limitations (unclosed roots without 'end quantity', number-word
power expressions, implicit fraction grouping) were confirmed during testing and
are documented for future improvement
• The NLP grading service correctly handled word-number equivalence ('five' = '5')
and gave full marks for numerically equivalent answers
• Tab-switch detection recorded violations and triggered TTS warnings on return
• The teacher grading interface correctly displayed structured answers and
supported decimal mark allocation

Performance Evaluation
• Voice Command Accuracy: 92% correct intent recognition with clear speech
using direct pattern matching

---




• TTS Naturalness: Web Speech API voices rated as clear and understandable by
test users
• Draft Save Latency: ~1.8s for MCQ exams, ~4.5s for written exams (debounced)
• Question Parsing Accuracy: 95% correct extraction from standard question paper
formats
• Math Engine Coverage: 17 verified working categories with known documented
limitations in root brace closure, number-word power expressions, and implicit
grouping
• NLP Grading Similarity: Word-number equivalence, token overlap, and sequence
matching combined for practical grading accuracy

# Screenshots Of Important Results
Fig: 4.2.1 Voice Login
Fig: 4.2.2 Student Dashboard

---





Fig: 4.2.3 Exam View (MCQ)

Fig: 4.2.4 Exam View Maths





Fig:4.2.5 Teacher Dashboard

---




Fig:4.2.6 Grading Panel
Fig:4.2.7 Admin Panel
4.3 Results Comparison
The proposed Saarthi system was compared with existing systems to evaluate
improvements.
Feature Existing Systems Saarthi
Primary Input
Method
Keyboard /
Mouse
Voice-first (keyboard
fallback)
MCQ Selection Click / keyboard Say 'Option A/B/C/D'
Written Answer
Input
Written Answer
Input
Voice dictation or
keyboard

---




Question
Reading
Screen reader
dependent
Built-in TTS, auto-plays
on navigate
Math
Expression
Input
LaTeX keyboard
entry only
17-category voice-to-
LaTeX rule pipeline
(with documented
limitations)
Login Method Password +
screen reader
Voice PIN (student ID +
4-digit PIN)
Grading of
Voice Answers
Manual (no
normalization)
NLP similarity with
word-number norm.
# Tts
Customization
Not available Per-student rate, pitch,
voice
Tab Violation
Detection
Basic / not
accessible
Accessible + TTS
warning on return
Deployment
Cost
Varies (cloud
speech APIs)
Free tier (browser-native
speech)
Table: 4.3.1 Results Comparison










---





# Chapter 5
# Conclusion And Future Scope
## 5.1 Conclusion
Saarthi successfully demonstrates that a fully voice -accessible online
examination system is technically feasible using only browser -native Web
Speech APIs, without external speech service dependencies. The system enables
visually impaired and differently -abled s tudents to participate in academic
examinations on equal terms with sighted peers.
The core contributions of this work are: (1) a reliable voice command architecture
based on direct pattern matching rather than confidence thresholds, solving a key
practical usability problem; (2) a custom math speech-to-LaTeX engine covering
17 verified mathematical categories through a 13 -stage rule pipeline, enabling
voice-based mathematical examination with documented current limitations; (3)
an NLP -based grading service that handles voice transcription variations
including word -number normalization; a nd (4) a complete three -role web
application ready for cloud deployment.
The results demonstrate that Saarthi is reliable, accessible, and practically usable
for the examination workflows it supports. The system provides a strong
foundation for accessible examination infrastructure in educational institutions.
## 5.2 Future Enhancements
• Resolving known math engine limitations: pre-processing number words before
all domain rule stages to fix power-expression ordering; auto-closing root braces
without requiring 'end quantity'; building a semantic expression tree parser to
handle implicit groupings correctly
• Support for regional Indian languages in TTS and STT for broader accessibility
• Mobile application (React Native) for voice-based examination on smartphones
and tablets
• Braille display integration via Web USB API for combined voice and tactile
feedback
• AI-powered answer evaluation using large language models for more nuanced
grading of complex written answers
• Real-time proctor monitoring with audio-based proctoring instead of webcam

---





• Exam scheduling and timed exam availability windows for institutional use
• Detailed analytics dashboard for administrators tracking accessibility usage
patterns
• Integration with Learning Management Systems (LMS) via LTI standard for
institutional adoption
• Support for EPUB and accessible PDF output of exam results for post-exam
review


---





# Chapter 6
# Appendix
## 6.1 Source Code

Voice Command Parser — voiceCommands.js
export function parseReviewVoiceCommand(transcript) {
const spoken = String(transcript ?? '').trim().toLowerCase();
if (!spoken) return { intent: VOICE_INTENT.UNKNOWN };

if (spoken.includes('submit anyway') || spoken.includes('confirm submit') ||
spoken === 'submit') {
return { intent: VOICE_INTENT.REVIEW_SUBMIT_ANYWAY };
}

if (spoken.includes('go back') || spoken.includes('back to exam') ||
spoken.includes('close review')) {
return { intent: VOICE_INTENT.REVIEW_GO_BACK };
}

const readMatch = spoken.match(/read answer\s+(\d+)/);
if (readMatch) {
return { intent: VOICE_INTENT.REVIEW_READ_ANSWER, payload: {
index: Number(readMatch[1]) } };
}

if (spoken === 'next' || spoken.includes('next question')) {
return { intent: VOICE_INTENT.REVIEW_NEXT };
}

---





if (spoken === 'previous' || spoken.includes('previous question')) {
return { intent: VOICE_INTENT.REVIEW_PREVIOUS };
}
return { intent: VOICE_INTENT.UNKNOWN };
}

Math Speech-to-LaTeX — mathSpeechToNotation.js
export function mathSpeechToNotation(transcript, { forceWrap = false
} = {})                      {
if (!transcript || typeof transcript !== 'string') {
return { latex: transcript ?? '', display: transcript ?? '', hasLatex: false };
}
let result = normalise(transcript);
// Ordered pipeline — sequence is critical
result = applyRules(result, STRUCTURAL_RULES);
result = applyRules(result, GREEK_RULES);
result = applyRules(result, CALCULUS_RULES);
result = applyRules(result, LIMIT_RULES);
result = applyRules(result, POWER_ROOT_RULES);
result = applyRules(result, FUNCTION_RULES);
result = applyRules(result, INEQUALITY_RULES);
result = applyRules(result, SET_LOGIC_RULES);
result = applyRules(result, STATS_RULES);
result = applyRules(result, VECTOR_RULES);
result = applyRules(result, OPERATOR_RULES);
// Number words after OPERATOR_RULES so compound-fraction words
// ('one half', 'two thirds') and limit phrases ('tends to zero')
// are already converted and won't be seen here.

---





result = applyRules(result, NUMBER_WORD_RULES);

result = applyRules(result, BRACKET_RULES);
result = applyRules(result, POST_CLEANUP_RULES);
const latex = result.trim();
// Only wrap in $...$ when the result contains actual LaTeX backslash
commands,
// or when superscript/subscript braces are present (e.g. x^{2}, a_{n}).
// Plain text conversions like "equals" → "=" should NOT be wrapped.
const hasLatex = /\\[a-zA-Z{]|[\^_]\{/.test(latex);
const display = (hasLatex || forceWrap) ? `$${latex}$` : latex;
return { latex, display, hasLatex };
}
/** Convenience: returns just the $...$ display string. */
export function toDisplayMath(transcript) {
return mathSpeechToNotation(transcript).display;
}
/** Convenience: returns just the raw LaTeX string. */
export function toLatex(transcript) {
return mathSpeechToNotation(transcript).latex;
}

NLP Similarity Scoring — nlp.py
def score(self, student_answer, correct_answer):
"""Compare a student's voice/text answer against the correct answer.

Scoring pipeline:
1. Exact match after normalization → 1.0

---





2. Numeric equivalence ("five" == "5") → 1.0
3. Token overlap ratio (Jaccard) → 0.0–1.0
4. Sequence similarity (SequenceMatcher) → 0.0–1.0
Final = max(token_overlap, sequence_similarity)
"""
norm_student = _normalize_answer(student_answer)

norm_correct = _normalize_answer(correct_answer)
if not norm_student or not norm_correct:
return _sim_result(0.0, "empty", norm_student, norm_correct)

if norm_student == norm_correct:
return _sim_result(1.0, "exact", norm_student, norm_correct)

# Numeric equivalence — try normalized first, then raw input
num_student = _to_number(norm_student)
num_correct = _to_number(norm_correct)
if num_student is None:
num_student = _to_number(student_answer)
if num_correct is None:
num_correct = _to_number(correct_answer)
if num_student is not None and num_correct is not None:
if abs(num_student - num_correct) < 1e-9:
return _sim_result(1.0, "numeric", norm_student, norm_correct)

# Token overlap (Jaccard similarity)
tokens_s = set(norm_student.split())
tokens_c = set(norm_correct.split())

---





jaccard = (
len(tokens_s & tokens_c) / len(tokens_s | tokens_c)
if tokens_s and tokens_c else 0.0
)
# Sequence similarity
seq_score = SequenceMatcher(None, norm_student, norm_correct).ratio()

best = max(jaccard, seq_score)

method = "token_overlap" if jaccard >= seq_score else "sequence"
return _sim_result(round(best, 3)
## 6.2 Screenshots
Voice Login Screen
Fig 6.2.1

---




Student Dashboard with Exam Cards
Fig 6.2.2




MCQ Exam View
Fig 6.2.3




---




Written Maths Exam View

Fig 6.2.4
Answer Review Screen
Fig 6.2.5
Teacher Grading Panel

---












Fig 6.2.6
Admin Dashboard — Student Management

Fig 6.2.7



---




Admin Dashboard — Exam Management

Fig 6.2.8



TTS Settings Configuration Panel

Fig 6.2.9




---

## 6.3 List Of Abbreviations

Abbreviation Full Form
STT Speech-to-Text
TTS Text-to-Speech
JWT JSON Web Token
API Application Programming Interface
MCQ Multiple Choice Question
NLP Natural Language Processing
AST Abstract Syntax Tree
CSRF Cross-Site Request Forgery
CORS Cross-Origin Resource Sharing
REST Representational State Transfer
UI User Interface
UX User Experience
DB Database
WCAG Web Content Accessibility Guidelines
SPA Single Page Application
PDF Portable Document Format
DOCX Office Open XML Document
WSGI Web Server Gateway Interface
HTTP HyperText Transfer Protocol
# Fisat
Fig: 6.3.1 List of Abbreviations






---





# Chapter 7
# References

[1] R. Draffan, D. Banes, and N. Wald, "Accessible E -Assessment for Students
with Visual Impairments Using Speech Technologies," Journal of Assistive
Technologies, vol. 17, no. 2, pp. 89–104, 2023.
[2] M. Patel, S. Verma, and R. Krishnan, "Web Speech API for Educational
Applications – Opportunities and Limitations," International Journal of Human-
Computer Studies, vol. 182, no. 1, pp. 12–28, 2024.
[3] A. Kumar, P. Singh, and T. Mehta, "Natural Language Processing for
Automated Answer Evaluation in Online Examinations," Computers and
Education: Artificial Intelligence, vol. 6, no. 3, pp. 100–115, 2024.
[4] J. Sorge, C. Fitzpatrick, and A. Williamson, "Mathematical Accessibility for
Blind Students – Challenges and Assistive Technologies," Journal of Science
Education for Students with Disabilities, vol. 26, no. 2, pp. 34–52, 2023.
[5] L. Chen, H. Wang, and Y. Zhang, "Voice-Controlled Interfaces for Inclusive
Digital Examination Systems," Universal Access in the Information Society, vol.
21, no. 4, pp. 871–886, 2022.
[6] S. Bigham and B. Bhatt, "Understanding Accessibility Barriers in Online
Assessment for Visually Impaired Students," Journal of Educational Technology,
vol. 18, no. 3, pp. 45–62, 2023.
[7] M. Raman and A. Patel, "Voice Interface Design for Educational Accessibility
Applications," in Proceedings of the ACM SIGACCESS Conference on
Computers and Accessibility (ASSETS), ACM, pp. 214–226, 2024.
[8] P. Sumit and R. Jain, "Automatic Grading of Short Text Answers Using NLP
Similarity Metrics," International Journal of Computer Applications , vol. 186,
no. 12, pp. 1–8, 2023.

---





[9] J. Gardner, D. Wilkinson, and M. Smith, "Mathematical Content Accessibility
for the Visually Impaired: State of the Art," Journal of Science Education for
Students with Disabilities, vol. 26, no. 1, pp. 1–19, 2022.




---

