import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Run every hour to check for items due in 24 hours
export const returnReminder = functions.pubsub.schedule("every 1 hours").onRun(async (context) => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  
  // Calculate 24 hours from now
  const twentyFourHoursFromNow = new Date(now.toDate().getTime() + 24 * 60 * 60 * 1000);
  const twentyFiveHoursFromNow = new Date(now.toDate().getTime() + 25 * 60 * 60 * 1000);

  const startTimestamp = admin.firestore.Timestamp.fromDate(twentyFourHoursFromNow);
  const endTimestamp = admin.firestore.Timestamp.fromDate(twentyFiveHoursFromNow);

  try {
    const transactionsRef = db.collection("transactions");
    const snapshot = await transactionsRef
      .where("status", "==", "active")
      .where("end_time", ">=", startTimestamp)
      .where("end_time", "<", endTimestamp)
      .get();

    if (snapshot.empty) {
      console.log("No transactions due for return reminder.");
      return null;
    }

    const batch = db.batch();

    snapshot.forEach((doc) => {
      const transaction = doc.data();
      
      // We will create an in-app notification in a 'notifications' collection
      const notificationRef = db.collection("notifications").doc();
      batch.set(notificationRef, {
        user_id: transaction.borrower_id,
        transaction_id: doc.id,
        item_id: transaction.item_id,
        message: "Just a friendly reminder that your borrowed item is due back tomorrow. Thanks for keeping our community library running smoothly!",
        read: false,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Reminder scheduled for borrower: ${transaction.borrower_id}, transaction: ${doc.id}`);
    });

    await batch.commit();
    console.log("Successfully sent return reminders.");
    
  } catch (error) {
    console.error("Error sending return reminders:", error);
  }

  return null;
});
