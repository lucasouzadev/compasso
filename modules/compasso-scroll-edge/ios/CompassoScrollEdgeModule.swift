import ExpoModulesCore
import SwiftUI
import UIKit

public final class CompassoScrollEdgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CompassoScrollEdge")
    View(ScrollEdgeAnchor.self) {
      Prop("scrollIdentifier") { (view: ScrollEdgeAnchor, value: String) in
        view.scrollIdentifier = value
      }
      Prop("hardEdge") { (view: ScrollEdgeAnchor, value: Bool) in
        view.hardEdge = value
      }
      OnViewDidUpdateProps { (view: ScrollEdgeAnchor) in view.updateEdge() }
    }
    View(DiaryReadingScroll.self)
  }
}

final class ScrollEdgeAnchor: ExpoView {
  var scrollIdentifier = ""
  var hardEdge = false
  private var edgeInteraction: UIInteraction?

  override func didMoveToWindow() {
    super.didMoveToWindow()
    updateEdge()
    DispatchQueue.main.async { [weak self] in self?.updateEdge() }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    updateEdge()
  }

  func updateEdge() {
    guard #available(iOS 26, *) else { return }
    guard window != nil else {
      if let edgeInteraction { removeInteraction(edgeInteraction) }
      edgeInteraction = nil
      return
    }
    guard !scrollIdentifier.isEmpty else { return }
    var ancestor = superview
    while let view = ancestor, view !== window {
      if let target = findIdentifier(in: view), let scroll = findScroll(in: target) {
        scroll.topEdgeEffect.style = hardEdge ? .hard : .soft
        if let interaction = edgeInteraction as? UIScrollEdgeElementContainerInteraction {
          interaction.scrollView = scroll
        } else {
          let interaction = UIScrollEdgeElementContainerInteraction()
          interaction.scrollView = scroll
          interaction.edge = .top
          addInteraction(interaction)
          edgeInteraction = interaction
        }
        return
      }
      ancestor = view.superview
    }
  }

  private func findIdentifier(in view: UIView) -> UIView? {
    if view === self { return nil }
    if view.accessibilityIdentifier == scrollIdentifier { return view }
    for child in view.subviews {
      if let match = findIdentifier(in: child) { return match }
    }
    return nil
  }

  private func findScroll(in view: UIView) -> UIScrollView? {
    if let scroll = view as? UIScrollView { return scroll }
    for child in view.subviews {
      if let scroll = findScroll(in: child) { return scroll }
    }
    return nil
  }
}

final class DiaryReadingScrollProps: ExpoSwiftUI.ViewProps {
  @Field var title: String = ""
  var onClose = EventDispatcher()
}

struct DiaryReadingScroll: ExpoSwiftUI.View {
  @ObservedObject var props: DiaryReadingScrollProps

  init(props: DiaryReadingScrollProps) {
    self.props = props
  }

  private var scroll: some View {
    ScrollView {
      VStack(spacing: 0) { Children() }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .scrollBounceBehavior(.basedOnSize, axes: .vertical)
    .scrollIndicators(.hidden)
  }

  private var header: some View {
    HStack {
      Text(props.title).font(.headline).accessibilityAddTraits(.isHeader)
      Spacer()
      Button {
        props.onClose()
      } label: {
        Image(systemName: "xmark")
          .frame(minWidth: 44, minHeight: 44)
      }
      .accessibilityLabel("Voltar à leitura")
    }
    .padding(.horizontal, 18)
  }

  var body: some View {
    if #available(iOS 26, *) {
      scroll.safeAreaBar(edge: .top, spacing: 0) { header }
        .scrollEdgeEffectStyle(.soft, for: .top)
    } else {
      scroll.safeAreaInset(edge: .top, spacing: 0) { header.background(.regularMaterial) }
    }
  }
}
