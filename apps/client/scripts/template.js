document.addEventListener("DOMContentLoaded", () => {
  console.log("@@@@ Start Script @@@@");
  
  const menu = Array.from(document.querySelectorAll("change-class-name"));
  menu.forEach((e) => {
    let txt = e.textContent;

      // 소괄호 (1.0:Menu) -> 폰트 사이즈 변경 em
      txt = txt.replace(/\(([\d.]+):([^)]+)\)/g, 
        (match, size, text) => `<span style="font-size: ${size}em;">${text}</span>`
      );

      // 대괄호 [#FFFFFF:Menu] -> Menu에 색상 적용
      txt = txt.replace(/\[(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})):([^\]]+)\]/g,
        (match, color, text) => `<span style="color: ${color};">${text}</span>`
      );

      // 중괄호 {Menu} -> 강조
      txt = txt.replace(/\{([^}]+)\}/g,
        '<strong>$1</strong>'
      );

      // *#FF0000* -> 작은 점
      txt = txt.replace(/\*(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))\*/g, 
      (match, color) => `
        <div 
          style="
            display: inline-block;
            width: 4px;
            height: 4px;
            background-color: ${color};
            border-radius: 50%;
            vertical-align: top;"
        ></div>`
      );
      e.innerHTML = txt;
  });
});

