module.exports = {
  important: true,
  purge: [],
  theme: {
    extend: {
      height: {
        'h-112': '26rem',
      },
      maxHeight: {
        '112': '26rem',
      },
      fontSize: {
        '7xl': '5rem',
        '8xl': '6rem',
        '9xl': '7rem',
        '10xl': '8rem',
        'jumbo': '16rem'
      },
      spacing: {
        1.5: "0.375rem",
        2.5: "0.625rem",
        18: "4.5rem",
        34: "8.25rem",
        36: "8.5rem",
      },
      boxShadow: {
        "focus-purple": "0 0 0 3px rgba(84, 105, 212, 0.15)",
        "focus-red": "0 0 0 3px #FED7D7",
      },
      width: {
        "1/7": "14.2857143%",
        "42rem": "42rem"
      },
      minHeight: {
        32: "8rem",
        5: "5rem",
      },
      backgroundImage: {
        "reso-logo":
          "url('https://2xx2gy2ovf3r21jclkjio3x8-wpengine.netdna-ssl.com/wp-content/uploads/2020/03/RESO_Certified_Vertical.Blue_.2020.jpeg')",
        "reso-logo-horizontal":
          "url('https://2xx2gy2ovf3r21jclkjio3x8-wpengine.netdna-ssl.com/wp-content/uploads/2020/06/RESO-Logo_Horizontal_Blue.png')",
        "reso-logo-vertical-blue": "url('https://2xx2gy2ovf3r21jclkjio3x8-wpengine.netdna-ssl.com/wp-content/uploads/2020/06/RESO-Logo_Vertical_Blue.png')",
      },
      colors: {
        resoactiveblue: '#2563EB',
        resoblue: "#182F58",
        resorush: "#194E92",
        resogray: "#666",
      }
    }
  },
  variants: {
    display: ["responsive", "group-hover"],
    borderColor: ["responsive", "hover", "focus", "focus-within"],
    boxShadow: ["responsive", "hover", "focus", "focus-within"],
    backgroundColor: ["responsive", "hover", "focus", "active"],
    color: ["responsive", "hover", "focus", "active"],
    wordBreak: ["responsive", "hover"],
    overflow: ["hover", "focus"],
  }
};
