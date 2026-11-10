import ExpoModulesCore
import Foundation
import ImageIO
import Vision

public final class CompassoTextRecognitionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CompassoTextRecognition")

    AsyncFunction("recognize") { (uri: String) throws -> String in
      guard let url = URL(string: uri), url.isFileURL,
            let source = CGImageSourceCreateWithURL(url as CFURL, nil) else {
        throw CocoaError(.fileReadCorruptFile)
      }

      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [String: Any]
      let orientationValue = properties?[kCGImagePropertyOrientation as String] as? UInt32
      let orientation = orientationValue.flatMap(CGImagePropertyOrientation.init(rawValue:)) ?? .up
      let request = VNRecognizeTextRequest()
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true

      let supported = try request.supportedRecognitionLanguages()
      let preferred = ["pt-BR", "en-US"].filter { supported.contains($0) }
      if !preferred.isEmpty {
        request.recognitionLanguages = preferred
      }

      let handler = VNImageRequestHandler(url: url, orientation: orientation, options: [:])
      try handler.perform([request])
      return (request.results ?? [])
        .compactMap { $0.topCandidates(1).first?.string }
        .joined(separator: "\n")
    }
  }
}
