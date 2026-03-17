"""
Email notifications service using SendGrid.
Sends exam submission confirmations to students.
"""

import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


def send_exam_submission_confirmation(student_email: str, student_name: str, exam_title: str):
    """
    Send exam submission confirmation email to student.
    
    Args:
        student_email: Student's email address
        student_name: Student's name
        exam_title: Title of the submitted exam
    """
    api_key = os.getenv("SENDGRID_API_KEY")
    if not api_key:
        print("⚠️  SENDGRID_API_KEY not set — email not sent (development mode)")
        return False
    
    try:
        message = Mail(
            from_email="noreply@saarthi-exam.com",  # Change to your domain
            to_emails=student_email,
            subject=f"Exam Submission Confirmation: {exam_title}",
            html_content=f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Exam Submission Confirmed! ✅</h2>
                    <p>Hi {student_name},</p>
                    
                    <p>Your exam has been successfully submitted.</p>
                    
                    <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <strong>Exam Details:</strong>
                        <br>Exam Name: {exam_title}
                        <br>Status: Submitted
                        <br>Timestamp: {get_current_time()}
                    </div>
                    
                    <p>Your exam will be reviewed by the instructor. You will receive another notification once grading is complete.</p>
                    
                    <p style="color: #666; font-size: 12px;">
                        This is an automated email. Please do not reply to this email.
                    </p>
                </body>
            </html>
            """
        )
        
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        
        print(f"✅ Email sent to {student_email} (Status: {response.status_code})")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False


def get_current_time():
    """Get current timestamp formatted nicely."""
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
