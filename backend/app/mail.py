import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import BaseModel

SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "no-reply@astraforge.com")
FROM_NAME = os.environ.get("FROM_NAME", "AstraForge Wealth Management")

def send_personalized_verification_email(to_email: str, name: str, verification_link: str):
    """
    Sends a beautifully designed, personalized HTML email for verification.
    Requires valid SMTP credentials in the environment variables.
    """
    if not SMTP_USERNAME or not SMTP_PASSWORD:
        print(f"⚠️ [MOCK EMAIL] To: {to_email} | Link: {verification_link}")
        print("Set SMTP_USERNAME and SMTP_PASSWORD to send real emails.")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Welcome to AstraForge - Verify Your Identity"
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email

    text_content = f"""
    Hello {name},
    
    Welcome to AstraForge Private Wealth Intelligence.
    Please verify your email address by clicking the link below:
    
    {verification_link}
    
    If you did not request this, please ignore this email.
    """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }}
            .header {{ background-color: #0f172a; padding: 30px; text-align: center; }}
            .header h1 {{ color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.5px; }}
            .header span {{ color: #c59b27; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }}
            .content {{ padding: 40px 30px; }}
            .content h2 {{ margin-top: 0; color: #1e293b; font-size: 20px; }}
            .content p {{ line-height: 1.6; color: #475569; font-size: 15px; }}
            .button-container {{ text-align: center; margin: 35px 0; }}
            .button {{ background-color: #c59b27; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; }}
            .footer {{ background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>AstraForge</h1>
                <span>Private Wealth Intelligence</span>
            </div>
            <div class="content">
                <h2>Welcome, {name}.</h2>
                <p>We are thrilled to welcome you to your new institutional-grade wealth management workspace.</p>
                <p>To ensure the security of your account and activate your deterministic product simulator, we require you to verify your email address.</p>
                
                <div class="button-container">
                    <a href="{verification_link}" class="button">Verify My Email Address</a>
                </div>
                
                <p>If you have any questions or require immediate assistance, your dedicated advisory desk is ready to help.</p>
                <p>Best regards,<br><strong>The AstraForge Security Team</strong></p>
            </div>
            <div class="footer">
                &copy; {2026} AstraForge Institutional Solutions. All rights reserved.<br>
                This is a secure, automated message. Please do not reply directly to this email.
            </div>
        </div>
    </body>
    </html>
    """

    part1 = MIMEText(text_content, "plain")
    part2 = MIMEText(html_content, "html")

    msg.attach(part1)
    msg.attach(part2)

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        server.quit()
        print(f"✅ Successfully sent personalized verification email to {to_email}")
    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        raise e
