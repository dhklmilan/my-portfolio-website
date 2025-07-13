<?php
// Check if form is submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {

  // Get form fields and remove whitespace
  $name = strip_tags(trim($_POST["name"]));
  $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
  $subject = strip_tags(trim($_POST["subject"]));
  $message = trim($_POST["message"]);

  // Validate form data
  if (empty($name) || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($subject) || empty($message)) {
    http_response_code(400);
    echo "Please complete the form correctly.";
    exit;
  }

  // Your email address
  $to = "dhklmilan@gmail.com";

  // Email subject
  $email_subject = "New Contact Form: $subject";

  // Email content
  $email_content = "Name: $name\n";
  $email_content .= "Email: $email\n\n";
  $email_content .= "Message:\n$message\n";

  // Email headers
  $email_headers = "From: $name <$email>";

  // Send email
  if (mail($to, $email_subject, $email_content, $email_headers)) {
    http_response_code(200);
    echo "Thank you! Your message has been sent.";
  } else {
    http_response_code(500);
    echo "Oops! Something went wrong and we couldn't send your message.";
  }

} else {
  // Not a POST request
  http_response_code(403);
  echo "There was a problem with your submission. Please try again.";
}
?>
