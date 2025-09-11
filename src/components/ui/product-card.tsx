import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Card, CardContent, CardFooter } from "./card";

interface ProductCardProps extends React.HTMLAttributes<HTMLDivElement> {
	product: {
		id: string;
		name: string;
		description: string;
		price: number;
		images: string[];
	};
	aspectRatio?: "portrait" | "square";
	width?: number;
	height?: number;
}

export function ProductCard({
	product,
	aspectRatio = "portrait",
	width,
	height,
	className,
	...props
}: ProductCardProps) {
	return (
		<Card
			className={cn("h-full overflow-hidden rounded-sm", className)}
			{...props}
		>
			<Link href={`/products/${product.id}`}>
				<div className="relative">
					<div
						className={cn(
							"overflow-hidden rounded-t-md",
							aspectRatio === "portrait" ? "aspect-[3/4]" : "aspect-square",
						)}
					>
						{product.images?.length ? (
							<Image
								src={product.images[0]}
								alt={product.name}
								fill
								className="object-cover transition-all hover:scale-105"
								priority={true}
							/>
						) : (
							<div className="flex h-full items-center justify-center bg-secondary">
								<span className="text-muted-foreground text-sm">
									Imagem não disponível
								</span>
							</div>
						)}
					</div>
				</div>
			</Link>
			<CardContent className="grid gap-2.5 p-4">
				<Link
					href={`/products/${product.id}`}
					className="line-clamp-1 font-semibold tracking-tight hover:underline"
				>
					{product.name}
				</Link>
				<div className="line-clamp-2 text-muted-foreground text-sm">
					{product.description}
				</div>
				<div className="font-semibold">
					{new Intl.NumberFormat("pt-BR", {
						style: "currency",
						currency: "BRL",
					}).format(product.price)}
				</div>
			</CardContent>
			<CardFooter className="p-4 pt-0">
				<Button className="w-full" variant="default">
					Adicionar ao carrinho
				</Button>
			</CardFooter>
		</Card>
	);
}
