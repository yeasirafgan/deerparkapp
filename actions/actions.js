//actions.js

'use server';

import connectMongo from '@/db/connectMongo';
import Timesheet from '@/models/Timesheet';
import WeeklySummary from '@/models/WeeklySummary';
import { calculateHoursWorked, getWeeklyPeriod } from '@/utils/dateUtils';
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { revalidatePath } from 'next/cache';

export default async function createTimesheet(formData) {
  try {
    await connectMongo();

    const session = await getKindeServerSession();
    const user = await session.getUser();
    const userId = user.id;
    const username =
      `${user.given_name || ''} ${user.family_name || ''}`.trim() || user.email;

    if (!userId || !username) throw new Error('User ID or username is missing');

    const dateStr = formData.get('date');
    const workstart = formData.get('start');
    const workend = formData.get('end');
    const isDraft = formData.get('isDraft') === 'true';

    // Validate dateStr
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }

    if (
      await Timesheet.countDocuments({
        userId,
        date: { $eq: date },
        start: workstart,
        end: workend,
      })
    ) {
      throw new Error('Time entry has already been logged for this period.');
    }

    console.log(`Date Parsed: ${date}`);
    const { startDate, endDate } = getWeeklyPeriod(date);

    console.log(`Weekly Period: StartDate: ${startDate}, EndDate: ${endDate}`);

    const newTimesheet = new Timesheet({
      userId,
      username,
      date,
      start: workstart,
      end: workend,
      isDraft,
    });

    await newTimesheet.save();

    const hoursWorked = calculateHoursWorked(workstart, workend);

    // Only update weekly summary if it's not a draft
    if (!isDraft) {
      await WeeklySummary.findOneAndUpdate(
        { userId, startDate, endDate },
        { $inc: { totalHours: hoursWorked } },
        { upsert: true }
      );
    }

    console.log(
      `Start: ${workstart}, End: ${workend}, Hours Worked: ${hoursWorked}`
    );

    // Send webhook to n8n only for final submissions (not drafts)
    if (!isDraft) {
      try {
        const webhookData = {
          userId,
          username,
          date: date.toISOString(),
          start: workstart,
          end: workend,
          hoursWorked,
          timesheetId: newTimesheet._id.toString()
        };

        const response = await fetch(process.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData),
        });

        if (!response.ok) {
          console.error('Failed to send webhook to n8n:', await response.text());
        } else {
          console.log('Successfully sent webhook to n8n');
        }
      } catch (webhookError) {
        // Log webhook error but don't fail the timesheet submission
        console.error('Error sending webhook to n8n:', webhookError);
      }
    }

    // Revalidate admin pages and timesheet page
    revalidatePath('/admin');
    revalidatePath(`/admin/${username}`);
    revalidatePath('/timesheet');

    return {
      status: 200,
      message: isDraft ? 'Saved as draft successfully' : 'Submitted successfully',
    };
  } catch (error) {
    console.error('Error saving timesheet:', error);
    // Handle the error appropriately, e.g., by showing an error message

    return {
      status: 500,
      message: error.message,
    };
  }
}
