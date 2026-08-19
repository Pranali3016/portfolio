/* =========================================================
   PRANALI HAGARE — PORTFOLIO CLIENT LOGIC & AI ENGINE
   Smooth Lenis Scrolling, Vivid Cyan (#00D9FF) Neural Mesh,
   Interactive AI Chatbot with Domain Guardrails, and Animations.
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     01. SHARED SCROLL DISPATCHER
  --------------------------------------------------------- */
  const scrollCallbacks = [];
  let scrollTicking = false;
  const onSharedScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      scrollCallbacks.forEach(fn => fn());
      scrollTicking = false;
    });
  };

  /* ---------------------------------------------------------
     02. LENIS SMOOTH SCROLLING
  --------------------------------------------------------- */
  const isTouchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  let lenis = null;
  if (!prefersReducedMotion && !isTouchDevice && window.Lenis && window.gsap) {
    lenis = new Lenis({
      duration: 1.3,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true
    });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------------------------------------------------
     03. TOAST NOTIFICATION HELPER
  --------------------------------------------------------- */
  const toastEl = document.getElementById('appToast');
  let toastTimer = null;
  const showToast = (message, duration = 3000) => {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.innerHTML = `<span>✓</span> ${message}`;
    toastEl.classList.add('show');
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  };

  /* ---------------------------------------------------------
     04. INTERACTIVE NEURAL PARTICLE NETWORK (CANVAS)
  --------------------------------------------------------- */
  const canvas = document.getElementById('bgCanvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height, dpr;
    let nodes = [], pulses = [], sparkles = [], shootingStar = null;
    const ACCENT = '0, 217, 255';     // Vivid Neon Cyan #00D9FF
    const ACCENT2 = '56, 189, 248';   // Cyber Sky Blue
    const LINK_DIST = 140;
    const MOUSE_RADIUS = 130;
    const mouse = { x: -9999, y: -9999, active: false };

    const isMobile = window.innerWidth <= 768;

    const resizeCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCount = isMobile ? 26 : 48;
      nodes = Array.from({ length: targetCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        isViolet: Math.random() < 0.3,
        radius: Math.random() * 1.5 + 1.2
      }));

      const sparkleCount = isMobile ? 35 : 70;
      sparkles = Array.from({ length: sparkleCount }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        r: Math.random() * 1.2 + 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03
      }));
    };

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    }, { passive: true });
    window.addEventListener('mouseleave', () => { mouse.active = false; });

    const maybeSpawnPulse = (links) => {
      if (prefersReducedMotion || !links.length || Math.random() > 0.03) return;
      const link = links[Math.floor(Math.random() * links.length)];
      pulses.push({ a: link.a, b: link.b, t: 0, isViolet: Math.random() < 0.35 });
    };

    let nextStarAt = performance.now() + 5000 + Math.random() * 5000;
    const maybeSpawnShootingStar = () => {
      if (prefersReducedMotion || shootingStar || performance.now() < nextStarAt) return;
      const startX = Math.random() * width;
      const angle = (30 + Math.random() * 25) * (Math.PI / 180);
      const speed = 7 + Math.random() * 4;
      shootingStar = {
        x: startX, y: -20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 80 + Math.random() * 30
      };
      nextStarAt = performance.now() + 8000 + Math.random() * 6000;
    };

    const drawShootingStar = () => {
      if (!shootingStar) return;
      const s = shootingStar;
      s.x += s.vx;
      s.y += s.vy;
      s.life++;

      const p = s.life / s.maxLife;
      const fade = p < 0.2 ? p / 0.2 : p > 0.7 ? Math.max(0, 1 - (p - 0.7) / 0.3) : 1;

      const tailX = s.x - s.vx * 14;
      const tailY = s.y - s.vy * 14;
      const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
      grad.addColorStop(0, 'rgba(0, 217, 255, 0)');
      grad.addColorStop(1, `rgba(255, 255, 255, ${(0.9 * fade).toFixed(2)})`);

      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
      ctx.restore();

      if (s.y > height + 50 || s.x > width + 50 || s.life >= s.maxLife) shootingStar = null;
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Update nodes
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;

        if (mouse.active) {
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < MOUSE_RADIUS * MOUSE_RADIUS && distSq > 0.1) {
            const d = Math.sqrt(distSq);
            const force = (1 - d / MOUSE_RADIUS) * 0.8;
            n.x += (dx / d) * force;
            n.y += (dy / d) * force;
          }
        }

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      });

      // Draw links
      const liveLinks = [];
      const linkDistSq = LINK_DIST * LINK_DIST;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < linkDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / LINK_DIST) * 0.35;
            ctx.strokeStyle = `rgba(${ACCENT}, ${alpha.toFixed(2)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            liveLinks.push({ a, b });
          }
        }
      }

      maybeSpawnPulse(liveLinks);
      maybeSpawnShootingStar();
      drawShootingStar();

      // Draw nodes
      nodes.forEach(n => {
        const color = n.isViolet ? ACCENT2 : ACCENT;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color}, 0.85)`;
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw sparkles
      sparkles.forEach(s => {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = width; else if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height; else if (s.y > height) s.y = 0;
        s.phase += s.speed;

        const twinkle = (Math.sin(s.phase) + 1) / 2;
        const alpha = 0.15 + twinkle * 0.55;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${ACCENT}, ${alpha.toFixed(2)})`;
        ctx.arc(s.x, s.y, s.r * (0.6 + twinkle * 0.6), 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw pulses
      pulses = pulses.filter(p => p.t <= 1);
      pulses.forEach(p => {
        const x = p.a.x + (p.b.x - p.a.x) * p.t;
        const y = p.a.y + (p.b.y - p.a.y) * p.t;
        const color = p.isViolet ? ACCENT2 : ACCENT;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${color}, 0.95)`;
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        p.t += 0.025;
      });

      requestAnimationFrame(render);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    if (!prefersReducedMotion) requestAnimationFrame(render);
  }

  /* ---------------------------------------------------------
     05. NAVBAR SCROLL EFFECT & ACTIVE STATE
  --------------------------------------------------------- */
  const nav = document.getElementById('mainNav');
  const onScrollNav = () => {
    if (!nav) return;
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  onScrollNav();
  scrollCallbacks.push(onScrollNav);

  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.nav-link[data-nav]');
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
  sections.forEach(sec => navObserver.observe(sec));

  /* Close mobile menu on click */
  const navMenu = document.getElementById('navMenu');
  document.querySelectorAll('#navMenu .nav-link, #navMenu .btn').forEach(link => {
    link.addEventListener('click', () => {
      if (navMenu && navMenu.classList.contains('show')) {
        bootstrap.Collapse.getOrCreateInstance(navMenu).hide();
      }
    });
  });

  /* ---------------------------------------------------------
     06. HERO TYPING EFFECT & TERMINAL SIMULATOR
  --------------------------------------------------------- */
  const roleEl = document.getElementById('roleText');
  const roles = [
    'LLM Engineer',
    'Machine Learning & Deep Learning',
    'Data Science & Data Analytics',
    'Agentic AI & RAG Architectures'
  ];
  if (roleEl && !prefersReducedMotion) {
    let rIdx = 0, cIdx = roles[0].length, deleting = false;
    const typeRole = () => {
      const current = roles[rIdx];
      if (!deleting) {
        cIdx++;
        if (cIdx > current.length) {
          deleting = true;
          setTimeout(typeRole, 1800);
          return;
        }
      } else {
        cIdx--;
        if (cIdx < 0) {
          deleting = false;
          rIdx = (rIdx + 1) % roles.length;
          cIdx = 0;
        }
      }
      roleEl.textContent = current.substring(0, cIdx);
      setTimeout(typeRole, deleting ? 35 : 65);
    };
    setTimeout(typeRole, 2000);
  }

  // Hero Terminal Presets
  const termCommand = document.getElementById('termCommand');
  const termOutput = document.getElementById('termOutput');
  const presetChips = document.querySelectorAll('.preset-chip');

  const terminalKnowledge = {
    explain_rag_architecture: {
      cmd: 'agent.explain_strengths()',
      lines: [
        '> Analyzing Candidate Profile: Pranali Hagare...',
        '> Specialization: Agentic RAG Pipelines, LangGraph & Full-Stack AI',
        '> Production Experience: Test Yantra (HireSense & VIKIMO RAG)',
        '> Research Credentials: IEEE Published Author & Govt. of India Copyright',
        '> Key Edge: Bridges research models into low-latency production APIs & Web Apps'
      ]
    },
    show_top_projects: {
      cmd: 'agent.list_production_projects()',
      lines: [
        '> [01] HireSense: AI Resume Intelligence (FastAPI, LangGraph, Groq, ChromaDB)',
        '> [02] VIKIMO Assistant: Automotive Parts RAG Agent (Zero Hallucination)',
        '> [03] Indian Sign Language: Real-Time LSTM (IEEE Published & Copyrighted)',
        '> [04] CropSense: 99.32% Accuracy ML Agriculture Recommendation Engine'
      ]
    },
    verify_research: {
      cmd: 'agent.verify_academic_credentials()',
      lines: [
        '> [PAPER] "Real-Time Indian Sign Language Recognition using Deep LSTM"',
        '> [VENUE] IEEE MITADTSoCiCon 2024 (Peer Reviewed Conference)',
        '> [PATENT/IP] Copyright Office, Government of India (Registered)',
        '> [DEGREE] B.E. AI & Data Science (Baramati, CGPA 8.19 Distinction)'
      ]
    }
  };

  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.dataset.cmd;
      const data = terminalKnowledge[key];
      if (!data || !termCommand || !termOutput) return;

      termCommand.textContent = data.cmd;
      termOutput.innerHTML = '';
      data.lines.forEach((line, i) => {
        setTimeout(() => {
          const div = document.createElement('div');
          div.className = 'term-line ' + (line.includes('[0') || line.includes('[PAPER') ? 'highlight' : line.includes('Distinction') ? 'success' : '');
          div.textContent = line;
          termOutput.appendChild(div);
        }, i * 150);
      });
    });
  });

  /* ---------------------------------------------------------
     07. INTERACTIVE AI PLAYGROUND / CHATBOT ENGINE (With Domain Guardrails)
  --------------------------------------------------------- */
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const suggestedPrompts = document.querySelectorAll('.chat-prompt-pill');
  const floatingAiBtn = document.getElementById('floatingAiBtn');

  const scrollToAiPlayground = () => {
    const aiSection = document.getElementById('ai-playground');
    if (aiSection) {
      aiSection.scrollIntoView({ behavior: 'smooth' });
      if (chatInput) chatInput.focus();
    }
  };
  if (floatingAiBtn) floatingAiBtn.addEventListener('click', scrollToAiPlayground);

  const botKnowledge = [
    // 1. SPECIFIC PROJECTS & CHATBOT INFO FIRST
    {
      keywords: ['langgraph simulator', 'langgraph simulator', 'are you langgraph', 'what are you using', 'how are you built', 'powering this', 'built with', 'technology here', 'chatbot technology', 'chatbot built'],
      response: "This portfolio chatbot is a lightweight **client-side JavaScript agent simulator** designed for instant offline replies without server latency. However, Pranali's production projects (like **HireSense** and **VIKIMO**) are fully powered by **LangGraph state orchestrators**, **LangChain**, and **Groq LLaMA-3.3**!"
    },
    {
      keywords: ['hiresense', 'hire sense', 'resume screening', 'fastapi', 'chromadb', 'groq', 'vercel', 'langgraph project'],
      response: "<strong>HireSense</strong> is Pranali's flagship full-stack AI Resume Intelligence System:<br><br>&bull; <strong>Backend:</strong> FastAPI with LangGraph state graphs for multi-step agent reasoning.<br>&bull; <strong>RAG &amp; Storage:</strong> ChromaDB vector store + Supabase PostgreSQL.<br>&bull; <strong>Inference:</strong> Groq's LLaMA-3.3-70B for sub-second semantic matching and candidate ranking.<br>&bull; <strong>Live Web App:</strong> Deployed on Render &amp; Vercel (<a href='https://hiresense-vert.vercel.app/' target='_blank' rel='noopener'>Launch Live Demo</a>)."
    },
    {
      keywords: ['vikimo', 'vikmo', 'dealer', 'auto parts', 'parts catalog'],
      response: "<strong>VIKIMO Assistant</strong> is an enterprise RAG chatbot designed for automotive dealerships. It parses complex automotive parts catalogs, indexes them into ChromaDB, and uses LangChain/LangGraph to provide dealership technicians with instant, zero-hallucination parts lookup."
    },
    {
      keywords: ['cropsense', 'cropsence', 'agriculture', 'crop', 'random forest', 'farmers', 'soil', 'farming', '99.32'],
      response: "<strong>CropSense</strong> is an applied agriculture ML engine achieving <strong>99.32% test accuracy</strong>. It analyzes 7 soil nutrients (N, P, K) and climate factors (temperature, rainfall, pH, humidity) using a 100-estimator Random Forest classifier across 22 crop classes. Live on GitHub Pages (<a href='https://Pranali3016.github.io/Agriculture-Optimization-Engine' target='_blank' rel='noopener'>Live Web App</a>)."
    },
    {
      keywords: ['job agent', 'job search agent', 'autonomous job', 'bengaluru', 'bengaluru price', 'house price', 'property price'],
      response: "Pranali built two additional production projects:<br><br>&bull; <strong>Autonomous Job Search Agent:</strong> A LangGraph-powered agent that autonomously searches job portals, evaluates postings, and ranks them based on skill-fit scoring using LLM grading.<br>&bull; <strong>Bengaluru House Price Predictor:</strong> An ML regression pipeline predicting property valuations on 13,000+ records using EDA, dimensionality reduction, and a tuned ensemble regressor with R² score of 0.86."
    },
    // 2. ALL PROJECTS & PORTFOLIO ITEMS
    {
      keywords: ['project', 'projects', 'what projects', 'show projects', 'all projects', 'portfolio projects', 'what has she built', 'what did she build', 'she built', 'she made', 'her project', 'her projects'],
      response: "Pranali has built <strong>6 production-grade AI/ML projects</strong>:<br><br>1. 🤖 <strong>HireSense</strong> — LangGraph + FastAPI AI resume intelligence platform (Live)<br>2. 🚗 <strong>VIKIMO</strong> — Enterprise RAG chatbot for automotive dealerships<br>3. 🤟 <strong>Indian Sign Language</strong> — IEEE-published LSTM recognition system (96.25% acc.)<br>4. 🌾 <strong>CropSense</strong> — Agriculture ML engine (99.32% accuracy, Live)<br>5. 💼 <strong>Autonomous Job Agent</strong> — LangGraph-powered self-driving job search agent<br>6. 🏠 <strong>Bengaluru House Price Predictor</strong> — Regression pipeline on 13,000+ records<br><br>Ask about any specific project for architecture details!"
    },
    // 3. RESEARCH & PUBLICATIONS
    {
      keywords: ['ieee', 'paper', 'research', 'publication', 'copyright', 'sign language', 'isl', 'gesture', 'lstm accuracy', 'signbridge'],
      response: "Pranali's research on <strong>SignBridge AI / Indian Sign Language Recognition</strong> achieved two major milestones:<br><br>1. <strong>IEEE Conference Paper:</strong> Published at <em>IEEE MITADTSoCiCon 2024</em>, achieving 60 FPS real-time translation using MediaPipe Holistic and PyTorch LSTM sequence models.<br>2. <strong>Government of India Copyright:</strong> Officially registered IP for the software design and methodology with the Copyright Office, Govt. of India."
    },
    // 4. TIMELINE, EDUCATION & ROLES
    {
      keywords: ['after graduation', 'after college', 'after degree', 'after she graduated', 'what happened after', 'post graduation', 'first job', 'career start', 'career path', 'career journey', 'journey', 'timeline', 'what did she do', 'what has she done', 'career history', 'work history', 'professional journey', 'she did after', 'did after', 'qspiders', 'leometric'],
      response: "Pranali's career timeline:<br><br>1. <strong>Python Developer Intern (Jul 2026–Present) — Leometric Technology Pvt Ltd:</strong> Designing &amp; implementing RESTful APIs with Django REST Framework (DRF), JWT/OAuth, RBAC permissions, PostgreSQL/MySQL, Postman, and Git/GitLab.<br><br>2. <strong>Associate Software Engineer (Nov 2025–Mar 2026) — Test Yantra:</strong> Python, APIs, databases, LLMs, and RAG workflows.<br><br>3. <strong>Full-Stack Python Course (Jan–Nov 2025) — QSpiders:</strong> Python, SQL, HTML, CSS, JavaScript, FastAPI.<br><br>4. <strong>ML Intern (Jun–Dec 2024) — Oasis Infobyte:</strong> Supervised/unsupervised ML, EDA, scikit-learn."
    },
    {
      keywords: ['internship', 'leometric', 'leometric technology', 'drf', 'django', 'oasis', 'oasis infobyte', 'intern', 'first role', 'ml intern', 'python intern'],
      response: "Pranali's internship experience:<br><br>&bull; <strong>Python Developer Intern — Leometric Technology Pvt Ltd (Jul 2026–Present):</strong> Designing RESTful APIs using Django REST Framework (DRF), implementing JWT auth, Google OAuth, role-based access control (RBAC), PostgreSQL/MySQL databases, Postman API testing, and Git/GitLab workflows.<br><br>&bull; <strong>ML Intern — Oasis Infobyte (Jun–Dec 2024):</strong> Built and evaluated supervised &amp; unsupervised ML models and predictive scikit-learn pipelines."
    },
    {
      keywords: ['work experience', 'experience', 'worked at', 'companies', 'employer', 'previous job', 'current role', 'availability', 'available', 'test yantra', 'leometric'],
      response: "Pranali's professional experience includes:<br><br>&bull; <strong>Python Developer Intern — Leometric Technology Pvt Ltd</strong> (Jul 2026 – Present): RESTful APIs, Django REST Framework (DRF), JWT/OAuth, RBAC permissions, PostgreSQL/MySQL, Postman, Git/GitLab.<br>&bull; <strong>Associate Software Engineer — Test Yantra</strong> (Nov 2025 – Mar 2026): Python, APIs, databases, LLM &amp; RAG workflows.<br>&bull; <strong>ML Intern — Oasis Infobyte</strong> (Jun–Dec 2024): Supervised/unsupervised ML models, EDA, scikit-learn pipelines.<br>&bull; <strong>Full-Stack Python Course — QSpiders</strong> (Jan–Nov 2025): Python, SQL, HTML, CSS, JavaScript, FastAPI."
    },
    {
      keywords: ['education', 'degree', 'college', 'cgpa', 'baramati', 'vpkbiet', 'university', 'graduated', 'graduation', 'studied', 'study', 'b.e', 'bachelor', 'final year', 'academic'],
      response: "Pranali holds a <strong>Bachelor of Engineering in Artificial Intelligence &amp; Data Science</strong> from VPKBIET Baramati, graduating with distinction (<strong>CGPA 8.19</strong>). During her degree (2020–2024), she authored her IEEE-published research on Indian Sign Language and built the 99.32% accuracy CropSense engine."
    },
    // 5. SKILLS & CAPABILITIES
    {
      keywords: ['skills', 'stack', 'tech', 'tools', 'languages', 'frameworks', 'what can she do', 'what does she know', 'technologies', 'supervised', 'unsupervised'],
      response: "Pranali's core tech stack includes:<br><br>&bull; <strong>Agentic AI &amp; LLMs:</strong> LangGraph, LangChain, RAG, ChromaDB, Groq LLaMA-3.3, Prompt Engineering<br>&bull; <strong>Core ML &amp; Deep Learning:</strong> Supervised &amp; Unsupervised ML, scikit-learn, Random Forest, LSTM, Sequence Models, Evaluation Metrics, NLP &amp; Transformers<br>&bull; <strong>Backend &amp; Infra:</strong> Python 3.11+, FastAPI, Flask, Docker, Git, SQL, HTML/CSS, JavaScript<br>&bull; <strong>Databases &amp; Analytics:</strong> Supabase, PostgreSQL, MySQL, pandas, NumPy, EDA"
    },
    // 6. CONTACT & HIRE
    {
      keywords: ['contact', 'email', 'reach', 'linkedin', 'connect', 'interview', 'hire her', 'call', 'get in touch', 'how to contact'],
      response: "You can reach Pranali directly through:<br><br>&bull; <strong>Email:</strong> <a href='mailto:pranalihagare@gmail.com'>pranalihagare@gmail.com</a><br>&bull; <strong>LinkedIn:</strong> <a href='https://www.linkedin.com/in/pranali-hagare/' target='_blank' rel='noopener'>linkedin.com/in/pranali-hagare</a><br>&bull; <strong>GitHub:</strong> <a href='https://github.com/Pranali3016' target='_blank' rel='noopener'>github.com/Pranali3016</a><br>&bull; <strong>Availability:</strong> Immediate / Open globally."
    },
    {
      keywords: ['hire', 'why hire', 'unique', 'choose', 'strengths', 'fit', 'advantage', 'should we', 'good candidate', 'right person'],
      response: "Pranali brings a rare combination of <strong>deep academic rigor</strong> and <strong>production-first engineering</strong>:<br><br>1. <strong>Production Agentic AI:</strong> Built <em>HireSense</em> (LangGraph, FastAPI, ChromaDB, Groq LLaMA-3.3-70B) &amp; <em>VIKIMO</em> dealer RAG assistant.<br>2. <strong>Published Researcher:</strong> Authored peer-reviewed Indian Sign Language LSTM paper at <em>IEEE MITADTSoCiCon 2024</em>.<br>3. <strong>Government Registered Copyright:</strong> Official software IP holder with the Govt. of India.<br>4. <strong>ML Precision:</strong> Built <em>CropSense</em> achieving 99.32% test accuracy.<br><br>She is available immediately for AI/ML &amp; Agentic Engineering roles!"
    },
    // 7. PERSONAL DETAILS & NON-PROFESSIONAL FILTERS
    {
      keywords: ['age', 'old is', 'birthday', 'birth date', 'born', 'birthdate'],
      response: "I specialize in Pranali's professional background, technical projects, and research. I do not store or share her personal details like age or date of birth. For details on her academic and career timeline, please feel free to check her <a href='#experience'>Career Timeline</a> or <a href='assets/CV_Pranali_Hagare.pdf' download>download her resume</a>!"
    },
    {
      keywords: ['salary', 'package', 'compensation', 'fees', 'charge', 'cost to hire', 'expected salary'],
      response: "For discussions regarding salary expectations, compensation packages, or contracting rates, please connect with Pranali directly via email at <a href='mailto:pranalihagare@gmail.com'>pranalihagare@gmail.com</a>."
    },
    {
      keywords: ['personal life', 'married', 'relationship', 'boyfriend', 'husband', 'single', 'spouse', 'hobbies', 'hobby', 'hometown', 'address', 'home', 'live in', 'living'],
      response: "I am an AI assistant focused on Pranali's professional engineering profile. I do not store information on her personal life, relationships, or hobbies. Feel free to ask about her technical skills, projects like <em>HireSense</em>, or her research publications!"
    },
    // 8. GENERIC INTENTS LAST (prevent generic phrase from stealing specific project query matches)
    {
      keywords: ['who is', 'who are you', 'tell me about her', 'tell me about pranali', 'introduce', 'background', 'overview', 'summary', 'profile', 'tell me about herself'],
      response: "I'm Pranali's AI Portfolio Assistant! Here's a quick overview of <strong>Pranali Hagare</strong>:<br><br>She is an <strong>AI/ML Engineer</strong> specializing in Agentic AI, LangGraph RAG systems, and Deep Learning.<br><br>&bull; 🎓 <strong>B.E. in AI &amp; Data Science</strong> — VPKBIET Baramati (CGPA 8.19)<br>&bull; 📄 <strong>IEEE Published Researcher</strong> — Indian Sign Language (96.25% LSTM accuracy)<br>&bull; 🛡️ <strong>Government of India Copyright Holder</strong><br>&bull; 🚀 Production systems: HireSense, VIKIMO, CropSense, Job Agent<br>&bull; ⚡ Available immediately for global AI/ML roles<br><br>Ask me anything about her projects, tech stack, or research!"
    }
  ];

  // Context-aware off-topic detection — understands pronouns and relative questions
  const isOffTopicQuery = (query) => {
    const lower = query.toLowerCase();

    // Exclude personal detail keywords from normal portfolio contextual queries
    const personalKeywords = ['age', 'old is', 'birthday', 'born', 'salary', 'married', 'boyfriend', 'husband', 'relationship', 'hobby', 'hobbies'];
    const containsPersonal = personalKeywords.some(pw => lower.includes(pw));

    // If it's not a personal query, check contextual pronouns
    if (!containsPersonal) {
      const contextualPronouns = [
        'she', 'her', 'hers', 'what did', 'what has', 'what does', 'what is she',
        'what was she', 'what did she', 'tell me', 'after graduation', 'after college',
        'career path', 'professional', 'journey', 'timeline', 'history', 'story',
        'how did', 'when did', 'where did', 'which', 'what are', 'has she', 'had she',
        'did she', 'has pranali', 'did pranali', 'about her', 'her experience',
        'her background', 'her skills', 'her projects', 'her research', 'she worked',
        'she built', 'she studied', 'she graduated', 'she did', 'she has', 'she was',
        'after degree', 'post graduation', 'first job', 'job after'
      ];
      if (contextualPronouns.some(p => lower.includes(p))) return false;
    }

    // Known relevant domain topics
    const relevantTerms = [
      'pranali', 'hire', 'project', 'hiresense', 'vikimo', 'cropsense', 'sign language',
      'isl', 'lstm', 'ieee', 'paper', 'research', 'publication', 'copyright', 'langgraph',
      'rag', 'groq', 'llama', 'fastapi', 'skill', 'stack', 'experience', 'internship',
      'test yantra', 'oasis', 'education', 'degree', 'vpkbiet', 'cgpa', 'contact',
      'email', 'linkedin', 'github', 'resume', 'cv', 'job', 'agent', 'machine learning',
      'deep learning', 'computer vision', 'bengaluru', 'house price', 'ai', 'ml', 'python',
      'work', 'background', 'about', 'who are you', 'availability', 'location', 'role',
      'what do you do', 'strengths', 'qualification', 'career', 'graduate', 'graduation',
      'journey', 'timeline', 'history', 'overview', 'summary', 'profile', 'tell', 'built',
      'made', 'created', 'developed', 'worked', 'studied', 'completed', 'achieved',
      'university', 'college', 'after', 'before', 'when', 'where', 'how', 'why',
      'technologies', 'frameworks', 'tools', 'language', 'framework', 'pytorch',
      'tensorflow', 'chromadb', 'docker', 'flask', 'supabase', 'postgresql',
      'oasis infobyte', 'internship', 'projects', 'all projects', 'portfolio'
    ];

    if (relevantTerms.some(term => lower.includes(term))) return false;

    // Truly off-topic triggers only
    const offTopicTriggers = [
      'gandhi', 'weather', 'recipe', 'cook', 'cricket', 'football', 'game',
      'movie', 'song', 'president', 'prime minister', 'modi', 'trump', 'biden',
      'what is the meaning of life', 'capital of', 'math problem', 'translate',
      'tell me a story', 'tell me a joke', 'write a poem', 'stupid', 'hack'
    ];
    if (offTopicTriggers.some(trigger => lower.includes(trigger))) return true;

    // Short vague queries that have no context — ask for clarification instead
    if (lower.split(' ').length <= 2) return false; // let short queries try to match

    return true;
  };

  const getBotResponse = (query) => {
    const lower = query.toLowerCase();

    // Check for matched knowledge first (keyword matching)
    for (const item of botKnowledge) {
      if (item.keywords.some(kw => lower.includes(kw))) {
        return item.response;
      }
    }

    // Check if off-topic
    if (isOffTopicQuery(query)) {
      return "I can only answer questions about <strong>Pranali Hagare's</strong> professional background, AI/ML projects, research, and career. Try asking:<br><br>&bull; \"What did she do after graduation?\"<br>&bull; \"Tell me about HireSense\"<br>&bull; \"What is her tech stack?\"<br>&bull; \"Why should we hire Pranali?\"";
    }

    // Context-aware fallback — if the question seems to be about her but doesn't match a specific topic
    return `<strong>Pranali Hagare</strong> is an AI/ML Engineer with expertise in LangGraph, RAG systems, and Deep Learning. She has an <strong>IEEE Publication</strong>, <strong>Govt. Copyright</strong>, and production systems like <em>HireSense</em> and <em>CropSense</em>.<br><br>Could you be more specific? Try asking about her <a href='#work'>projects</a>, <a href='#stack'>skills</a>, <a href='#experience'>career timeline</a>, or <a href='#research'>research</a>!`;
  };


  const appendMessage = (sender, htmlText) => {
    if (!chatMessages) return;
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${sender}-msg`;
    msgDiv.innerHTML = `
      <div class="msg-avatar">${sender === 'user' ? '👤' : '✦'}</div>
      <div class="msg-content"><p>${htmlText}</p></div>
    `;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const handleUserQuery = (text) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    appendMessage('user', cleanText);
    if (chatInput) chatInput.value = '';

    // Show typing simulation
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-msg bot-msg typing-msg';
    typingDiv.innerHTML = `
      <div class="msg-avatar">✦</div>
      <div class="msg-content"><p><em>Streaming response... ⚡</em></p></div>
    `;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    setTimeout(() => {
      typingDiv.remove();
      const botAns = getBotResponse(cleanText);
      appendMessage('bot', botAns);
    }, 450);
  };

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleUserQuery(chatInput.value);
    });
  }

  suggestedPrompts.forEach(pill => {
    pill.addEventListener('click', () => {
      handleUserQuery(pill.dataset.query);
    });
  });

  /* ---------------------------------------------------------
     08. QUICK COPY ACTIONS & COMING SOON PROJECT TOASTS
  --------------------------------------------------------- */
  const quickCopyEmailBtn = document.getElementById('quickCopyEmailBtn');
  if (quickCopyEmailBtn) {
    quickCopyEmailBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('pranalihagare@gmail.com').then(() => {
        showToast('Email copied: pranalihagare@gmail.com');
      });
    });
  }

  // Coming soon project handler
  const comingSoonBtns = document.querySelectorAll('.btn-coming-soon');
  comingSoonBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Coming Soon! Pranali is currently developing this autonomous agent.');
    });
  });




  /* ---------------------------------------------------------
     09. CONTACT FORM SUBMISSION — Formspree (direct to Gmail)
     HOW TO ACTIVATE:
       1. Go to https://formspree.io and sign up free
       2. Create a new form, set email to pranalihagare@gmail.com
       3. Copy your endpoint (looks like: https://formspree.io/f/xabcdefg)
       4. Paste it as the FORMSPREE_ENDPOINT value below
  --------------------------------------------------------- */
  const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xzepeyvb'; // ← replace YOUR_FORM_ID

  const contactForm = document.getElementById('contactForm');
  const formStatus  = document.getElementById('formStatus');
  const submitBtn   = document.getElementById('contactSubmitBtn');
  const submitBtnText = document.getElementById('submitBtnText');

  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name    = document.getElementById('cf-name').value.trim();
      const email   = document.getElementById('cf-email').value.trim();
      const subject = document.getElementById('cf-subject')?.value.trim() || 'Portfolio Inquiry';
      const message = document.getElementById('cf-message').value.trim();

      if (!name || !email || !message) {
        if (formStatus) {
          formStatus.style.color = '#FF5F56';
          formStatus.textContent = 'Please fill out all required fields.';
        }
        return;
      }

      // Populate hidden Formspree fields
      const replytoField = document.getElementById('cf-replyto');
      const subjectField = document.getElementById('cf-subject-hidden');
      if (replytoField) replytoField.value = email;
      if (subjectField) subjectField.value = `[Portfolio] ${subject} — from ${name}`;

      // Loading state
      if (submitBtn) submitBtn.disabled = true;
      if (submitBtnText) submitBtnText.textContent = 'Sending...';
      if (formStatus) { formStatus.style.color = 'var(--text-muted)'; formStatus.textContent = ''; }

      // Check if endpoint is configured
      if (FORMSPREE_ENDPOINT.includes('YOUR_FORM_ID')) {
        // Fallback: open email client if Formspree not yet configured
        const mailtoSubject = encodeURIComponent(`[Portfolio] ${subject} - from ${name}`);
        const mailtoBody    = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
        window.location.href = `mailto:pranalihagare@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;
        if (submitBtnText) submitBtnText.textContent = 'Send Message';
        if (submitBtn) submitBtn.disabled = false;
        if (formStatus) { formStatus.style.color = 'var(--accent)'; formStatus.textContent = '✓ Opening email client...'; }
        showToast('Formspree not configured yet — opening email client instead.');
        return;
      }

      try {
        const formData = new FormData(contactForm);
        const response = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          if (formStatus) {
            formStatus.style.color = '#34D399';
            formStatus.innerHTML = '<span>✓</span> Message sent! I\'ll reply within 24 hours.';
          }
          showToast('✓ Message delivered to Pranali\'s inbox!');
          contactForm.reset();
        } else {
          const data = await response.json();
          const errMsg = data?.errors?.map(e => e.message).join(', ') || 'Something went wrong.';
          if (formStatus) { formStatus.style.color = '#FF5F56'; formStatus.textContent = errMsg; }
          showToast('Failed to send. Please email directly: pranalihagare@gmail.com');
        }
      } catch (err) {
        if (formStatus) { formStatus.style.color = '#FF5F56'; formStatus.textContent = 'Network error. Please try again.'; }
        showToast('Network error — please email directly: pranalihagare@gmail.com');
      } finally {
        if (submitBtnText) submitBtnText.textContent = 'Send Message';
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }


  /* ---------------------------------------------------------
     10. REVEAL-ON-SCROLL & NUMBER COUNTERS
  --------------------------------------------------------- */
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-down, .reveal-scale');
  if (prefersReducedMotion) {
    revealEls.forEach(el => el.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));
  }

  // Animated metric counters
  const metricValues = document.querySelectorAll('.m-val, .r-inline-val');
  if (!prefersReducedMotion && metricValues.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.dataset.counted) {
          entry.target.dataset.counted = 'true';
          const raw = entry.target.textContent.trim();
          const match = raw.match(/^([\d.]+)(.*)$/);
          if (match) {
            const targetNum = parseFloat(match[1]);
            const suffix = match[2];
            const decimals = (match[1].split('.')[1] || '').length;
            let start = 0;
            const duration = 1200;
            const startTime = performance.now();

            const animateCounter = (now) => {
              const p = Math.min(1, (now - startTime) / duration);
              const easeP = 1 - Math.pow(1 - p, 3);
              entry.target.textContent = (targetNum * easeP).toFixed(decimals) + suffix;
              if (p < 1) requestAnimationFrame(animateCounter);
            };
            requestAnimationFrame(animateCounter);
          }
        }
      });
    }, { threshold: 0.5 });
    metricValues.forEach(el => counterObserver.observe(el));
  }

  // Timeline scroll progress bar
  const timelineEl = document.querySelector('.timeline');
  if (timelineEl) {
    const updateTimeline = () => {
      const rect = timelineEl.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = (vh * 0.5 - rect.top) / rect.height;
      timelineEl.style.setProperty('--progress', Math.max(0, Math.min(1, progress)).toFixed(3));
    };
    updateTimeline();
    scrollCallbacks.push(updateTimeline);
  }

  // Run all scroll callbacks
  if (scrollCallbacks.length) {
    window.addEventListener('scroll', onSharedScroll, { passive: true });
  }
});