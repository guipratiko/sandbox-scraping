/**
 * Créditos do usuário (User.scrapingCredits no MongoDB)
 */

import mongoose from 'mongoose';

interface IUser {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email?: string;
  scrapingCredits?: number;
}

const UserSchema = new mongoose.Schema<IUser>(
  {
    name: String,
    email: String,
    scrapingCredits: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

export async function getCredits(userId: string): Promise<number> {
  const user = await User.findById(userId).select('scrapingCredits').lean();
  const raw = user?.scrapingCredits;
  const n = typeof raw === 'number' && !Number.isNaN(raw) ? raw : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Retorna o novo saldo em caso de sucesso, ou null se falhar. */
export async function debitCredits(userId: string, amount: number): Promise<number | null> {
  const num = Math.max(0, Math.floor(Number(amount)));
  if (num === 0) {
    const current = await getCredits(userId);
    return current;
  }
  const id = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
  if (!id) {
    console.error('[Scraping-Flow] debitCredits: userId inválido para ObjectId', userId);
    return null;
  }
  // Filtro: aceita scrapingCredits como número ou string
  const filter = {
    _id: id,
    $expr: { $gte: [{ $ifNull: [{ $toDouble: '$scrapingCredits' }, 0] }, num] },
  };
  // Pipeline: converte para número, subtrai e garante >= 0 (evita $inc em campo string)
  const updatePipeline = [
    {
      $set: {
        scrapingCredits: {
          $max: [0, { $subtract: [{ $toDouble: '$scrapingCredits' }, num] }],
        },
      },
    },
  ];
  const result = await User.findOneAndUpdate(filter, updatePipeline, { new: true });
  if (!result) {
    const current = await User.findById(id).select('scrapingCredits').lean();
    console.error('[Scraping-Flow] debitCredits: falhou', { userId, amount: num, currentCredits: current?.scrapingCredits });
    return null;
  }
  const newCredits = typeof result.scrapingCredits === 'number' ? result.scrapingCredits : Number(result.scrapingCredits) || 0;
  return newCredits;
}
