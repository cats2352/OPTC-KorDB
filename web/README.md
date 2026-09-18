# 원피스 트레저 크루즈 데이터베이스 — 메인 화면

GitHub Pages에 바로 배포할 수 있는 순수 정적 웹사이트입니다. 별도 설치나 빌드가 필요하지 않습니다.

## 폴더 안내

- `index.html`: 메인 화면
- `assets/css/style.css`: 화면 디자인과 모바일 반응형 스타일
- `assets/js/config.js`: DB 주소와 배너 정보를 바꾸는 설정
- `assets/js/main.js`: 버튼과 배너 동작
- `assets/banner/`: 배너 이미지 등록 폴더

## 배너 등록

`assets/banner/`에 이미지를 넣고 `assets/js/config.js`의 `imageUrl`만 수정하면 됩니다. 권장 크기는 `1600 × 500px`입니다.

## 캐릭터 DB 연결

DB 화면이 완성되면 `assets/js/config.js`의 `databaseUrl`에 주소를 입력하세요. 현재처럼 비워 두면 버튼을 눌렀을 때 준비 중 안내창이 열립니다.

## GitHub Pages 배포

이 `web` 폴더의 내용이 저장소의 최상위에 오도록 업로드한 뒤, GitHub 저장소의 `Settings → Pages`에서 배포 브랜치와 루트 폴더를 선택하면 됩니다.
