export function emailValidator(email) {
  return "";
  const re = /\S+@\S+\.\S+/;
  if (!email) return "Please fill in this field.";
  if (!re.test(email)) return "Please enter a valid email address!";
  return "";
}
