 # Broke No More

**Slay your budget.**

🔗 Live app: [broke-no-more-app.lovable.app](https://broke-no-more-app.lovable.app)

---

## Why I built this

Most finance apps feel like they were designed for 40-year-olds filing taxes. I wanted something that actually fits how my generation thinks about money — chaotic, visual, a little competitive, and honestly kind of fun.

So I built Broke No More. It tracks your expenses, yells at you (nicely) when you overspend, rewards you with XP and badges when you don't, and has an AI that gives you real spending insights instead of generic tips.

---

## What it does

You log expenses. The app categorizes them, tracks them against budgets you set, and shows you where your money is actually going through charts and weekly breakdowns.

The AI reads your spending patterns and tells you things like — "you spent 3x more on food delivery this week" or "cut 2 Swiggy orders and save ₹900 this month." It also has a chat interface so you can just ask it questions about your own finances.

The gamification layer makes it stick. You earn XP for logging expenses, maintaining streaks, and staying under budget. You level up from Broke → Saver → Investor → Money God. There are badges to unlock. It sounds silly until you actually start caring about your streak.

---

## Features

- Expense dashboard with donut chart, category breakdown, weekly/monthly/yearly views
- Budget goals per category with animated progress bars
- AI-powered spend insights — flags high expenses, celebrates low ones, suggests cuts
- Natural language chat — ask "how much did I spend on food this month?"
- XP system, Finance Rank leveling, streaks, and badge shelf
- Shareable weekly summary card (downloadable PNG)
- In-app toast notifications when you're approaching budget limits
- Full user authentication — every user's data is completely private

---

## Tech stack

- **React** + **Tailwind CSS** for the frontend
- **Supabase** for the database and authentication
- **Recharts** for data visualization
- **Lovable AI** (via Edge Functions) for the AI insights and chat
- Hosted on **Lovable Cloud**

---

## Database

Five tables in Supabase — `profiles`, `expenses`, `budgets`, `badges`, `user_stats`. Row Level Security is enabled on all of them so users only ever see their own data. A trigger auto-creates a profile and stats row whenever a new user signs up.



---

## What I learned building this

This was my first time building a full-stack app with a real database, real auth, and a real AI integration. A few things that actually surprised me:

- **Supabase Row Level Security** is genuinely powerful but easy to mess up. Getting RLS policies right so users can only touch their own rows took more debugging than I expected.
- **AI integration** is less about the AI and more about what context you give it. The quality of insights improved a lot once I started passing structured spending data as context instead of just raw numbers.
- **Gamification is hard to get right.** It's easy to add XP and badges. It's harder to make them feel meaningful rather than hollow.

---


*Built by [Your Name](https://github.com/aditirajput02)*
