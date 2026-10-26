export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { StudioComponent } from '@gitroom/frontend/components/studio/studio.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Postiz' : 'Gitroom'} Studio`,
  description: '',
};
export default async function Index() {
  return <StudioComponent />;
}
