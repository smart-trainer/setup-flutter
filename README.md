# Github Action: setup-flutter

This repository was originally forked from [subosito/flutter-action](https://github.com/subosito/flutter-action.git)

This action sets up a flutter environment on `macOS` for use in Github actions. 

If you update the code base remember to tag the latest commit using 

```
git add . 
git commit -m "any commit message"
git tag -a -m "any commit message" v1
git push --follow-tags
```

# Usage

## Inputs

- `flutter-version`: set specific version
  - go to [flutter.dev](https://flutter.dev/docs/development/tools/sdk/releases) and copy the version you need
  - defaults to latest version
- `channel`: set specific channel 
  - defaults to stable 

## Example 

```yaml
jobs:
  build:
    name: Build iOS and Android Flutter app
    runs-on: macos-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Setup Java 
        uses: actions/setup-java@v1
        with:
          java-version: '11.x'

      - name: Setup Flutter
        uses: smart-trainer/setup-flutter@v1
        with:
          flutter-version: '1.22.5'
          channel: 'stable' # 'beta' or 'dev' (optional, default to: 'stable')

      - name: Install dependencies 
        run: flutter pub get

      - name: Test
        run: flutter test

      - name: Build Android 
        run: flutter build apk # or flutter build appbundle

      - name: Build iOS
        run: flutter build ios --release --no-codesign
```
