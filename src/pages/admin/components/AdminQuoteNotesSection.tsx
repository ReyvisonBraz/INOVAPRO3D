import { Edit } from "lucide-react";

interface AdminQuoteNotesSectionProps {
  notes: string;
  onChangeNotes: (notes: string) => void;
}

export function AdminQuoteNotesSection({ notes, onChangeNotes }: AdminQuoteNotesSectionProps) {
  return (
    <section className="quote-editor-notes rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-7">
      <h3 className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-widest text-primary mb-6">
        <Edit className="w-4 h-4" /> Notas do Técnico
      </h3>
      <textarea
        rows={3}
        value={notes}
        onChange={(e) => onChangeNotes(e.target.value)}
        placeholder="Insira notas de qualidade, instruções de acabamento ou controle interno..."
        className="w-full rounded-xl border border-white/10 bg-[#0C0E14] px-4 py-3 text-sm text-white/85 placeholder:text-white/25 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/20 resize-none"
      />
    </section>
  );
}
