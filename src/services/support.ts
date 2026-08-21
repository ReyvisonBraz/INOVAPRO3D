import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export async function sendTicketReply(
  ticket: { id: string; email?: string },
  reply: string,
): Promise<void> {
  await addDoc(collection(db, "logs"), {
    action: "REPLY_SUPPORT",
    ticketId: ticket.id,
    userEmail: ticket.email,
    reply,
    adminId: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "tickets", ticket.id), { status: "RESPONDIDO" });
}

export async function updateTicketStatus(id: string, status: string): Promise<void> {
  await updateDoc(doc(db, "tickets", id), {
    status,
    updatedAt: serverTimestamp(),
  });
}
