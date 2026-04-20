import { NotionRenderer as ReactNotionRenderer } from "react-notion-x";
import type { ExtendedRecordMap } from "notion-types";
import type { BlogPost } from "../server/notion/notion";
import { getSlugByPageId } from "../server/notion/notion-page-map";
import { lazy, Suspense } from "react";

// 高级功能组件 - 懒加载优化
const Code = lazy(() =>
	import("react-notion-x/build/third-party/code").then((m) => ({ default: m.Code })),
);
const Collection = lazy(() =>
	import("react-notion-x/build/third-party/collection").then((m) => ({ default: m.Collection })),
);
const Equation = lazy(() =>
	import("react-notion-x/build/third-party/equation").then((m) => ({ default: m.Equation })),
);
const Modal = lazy(() =>
	import("react-notion-x/build/third-party/modal").then((m) => ({ default: m.Modal })),
);

// 自定义图片组件（优化加载）
const NotionImage = ({ src, alt }: { src: string; alt?: string }) => {
	return <img src={src} alt={alt || ""} loading="lazy" decoding="async" />;
};

interface NotionRendererProps {
	recordMap: ExtendedRecordMap;
	rootPageId?: string;
	darkMode?: boolean;
	slug?: string;
	post?: BlogPost;
}

export default function NotionRenderer({
	recordMap,
	rootPageId,
	darkMode = false,
	slug,
	post,
}: NotionRendererProps) {
	return (
		<Suspense fallback={<div className="notion-loading">Loading content...</div>}>
			<ReactNotionRenderer
				recordMap={recordMap}
				rootPageId={rootPageId}
				darkMode={darkMode}
				fullPage={false}
				components={{
					Code, // 代码块语法高亮（懒加载）
					Collection, // 数据库视图（懒加载）
					Equation, // 数学公式（懒加载）
					Modal, // 图片/页面预览弹窗（懒加载）
					Image: NotionImage, // 自定义图片组件
				}}
				showTableOfContents={false} // 使用自定义目录
				mapPageUrl={(pageId) => {
					// 使用slug生成链接
					if (pageId === rootPageId && slug) {
						return `/posts/${slug}`;
					}

					// 尝试从映射获取 slug
					const linkedSlug = getSlugByPageId(pageId);
					if (linkedSlug) {
						return `/posts/${linkedSlug}`;
					}

					// 回退到 pageId
					return `/posts/${pageId}`;
				}}
				// 增强配置
				previewImages={true}
				isImageZoomable={true}
				showCollectionViewDropdown={true}
				linkTableTitleProperties={true}
				defaultPageIcon="📄"
				defaultPageCover=""
				defaultPageCoverPosition={0.5}
				disableHeader={true}
				hideBlockId={true} // 隐藏块ID（生产环境）
			/>
		</Suspense>
	);
}
