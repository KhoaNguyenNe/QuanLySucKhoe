import React from "react";

import Background from "../components/Background";
import Logo from "../components/Logo";
import Header from "../components/Header";
import Paragraph from "../components/Paragraph";
import Button from "../components/Button";

export default function HomeScreen({ navigation }) {
  return (
    <Background>
      <Logo />
      <Header>Chào mừng 💫</Header>
      <Paragraph>Chúc mừng bạn đã đăng nhập thành công.</Paragraph>
      <Button
        mode="outlined"
        onPress={() =>
          navigation.reset({
            index: 0,
            routes: [{ name: "StartScreen" }],
          })
        }
      >
        Đăng xuất
      </Button>
    </Background>
  );
}
