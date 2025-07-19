# MyMeghMoney Backend

Backend API for the MyMeghMoney expense tracking application.

## Deployment to Render

1. Push this backend folder to a Git repository
2. Connect the repository to Render
3. Set the following environment variables in Render:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `FRONTEND_URL`: Your Vercel deployment URL
   - `NODE_ENV`: production

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mymegh-money
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

## Local Development

```bash
npm install
npm run dev
```

## API Endpoints

- `GET /health` - Health check
- `GET /api/people` - Get all people
- `GET /api/people/balances` - Get people with balances
- `POST /api/people` - Create new person
- `DELETE /api/people/:id` - Delete person
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/:id/details` - Get expense details
- `POST /api/expenses` - Create new expense
- `PATCH /api/expenses/:id/pay` - Record payment
- `GET /api/balances` - Get balance summary