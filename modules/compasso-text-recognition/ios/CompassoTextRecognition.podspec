Pod::Spec.new do |s|
  s.name = 'CompassoTextRecognition'
  s.version = '1.0.0'
  s.summary = 'On-device text recognition for the Compasso diary'
  s.homepage = 'https://github.com/lucasouzadev/compasso'
  s.license = 'MIT'
  s.author = 'Compasso'
  s.source = { :git => 'https://github.com/lucasouzadev/compasso.git' }
  s.platforms = { :ios => '17.0' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.source_files = '**/*.swift'
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision', 'ImageIO'
end
